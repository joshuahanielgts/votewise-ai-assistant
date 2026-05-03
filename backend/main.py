import os
import json
import logging
import sys
import time
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.schemas import ChatRequest, ChatResponse

# ── Google Cloud Structured Logging ───────────────────────────────────────────
class CloudRunFormatter(logging.Formatter):
    """
    Formats logs as JSON for Google Cloud Logging structured log ingestion.
    Cloud Run captures stdout and sends to Cloud Logging automatically.
    Severity levels map to Cloud Logging severity labels.
    """
    SEVERITY_MAP = {
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "WARNING": "WARNING",
        "ERROR": "ERROR",
        "CRITICAL": "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": self.SEVERITY_MAP.get(record.levelname, "DEFAULT"),
            "message": record.getMessage(),
            "component": record.name,
            "time": self.formatTime(record, self.datefmt),
            "logging.googleapis.com/sourceLocation": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            },
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "session_id"):
            log_entry["session_id"] = record.session_id
        if hasattr(record, "http_request"):
            log_entry["httpRequest"] = record.http_request
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(CloudRunFormatter())
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)


setup_logging()
logger = logging.getLogger(__name__)

# ── Load Config ───────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "").strip()
MAX_TOKENS           = int(os.getenv("MAX_TOKENS", "1500"))
TEMPERATURE          = float(os.getenv("TEMPERATURE", "0.7"))
GEMINI_ENDPOINT      = os.getenv("GEMINI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
MODEL                = os.getenv("GEMINI_MODEL", "gemini-2.0-flash") # Fallback to 2.0 if 2.5 not set

SYSTEM_PROMPT = """
You are VoteWise, an expert, friendly, and impartial AI assistant dedicated to
helping Indian citizens understand the democratic election process.
Strictly follow these rules:
1. Provide neutral, fact-based information based on ECI (Election Commission of India) guidelines.
2. Do not express personal opinions on candidates, parties, or political ideologies.
3. If asked about voter registration, explain Form 6 and the EPIC card process.
4. If asked about voting technology, explain EVMs and VVPATs.
5. Maintain a professional yet accessible tone suitable for first-time voters.
"""

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── Lifespan ─────────────────────────────────────────────────────────────────
http_client: httpx.AsyncClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    logger.info(f"Initializing VoteWise with model: {MODEL}")
    http_client = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_connections=100))
    
    # Debug: check static files
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    logger.info(f"STATIC_DIR: {static_dir}")
    if os.path.exists(static_dir):
        # Recursive list to find where index.html is
        files_found = []
        for root, dirs, f in os.walk(static_dir):
            for name in f:
                files_found.append(os.path.relpath(os.path.join(root, name), static_dir))
        logger.info(f"Static files found: {files_found}")
    else:
        logger.error("Static directory MISSING!")
        
    yield
    await http_client.aclose()

# ── App Setup ────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="VoteWise AI", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Cloud Logging Middleware ─────────────────────────────────────────────────
class CloudLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every HTTP request in Google Cloud Logging httpRequest format."""
    async def dispatch(self, request: StarletteRequest, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} {response.status_code}",
            extra={
                "http_request": {
                    "requestMethod": request.method,
                    "requestUrl": str(request.url),
                    "status": response.status_code,
                    "userAgent": request.headers.get("user-agent", ""),
                    "remoteIp": request.client.host if request.client else "",
                    "latency": f"{latency_ms:.2f}ms",
                }
            }
        )
        return response

app.add_middleware(CloudLoggingMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# ── API Routes ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL, "api_key_configured": bool(GEMINI_API_KEY)}

@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key missing")

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in body.history:
            messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": body.message})

        response = await http_client.post(
            GEMINI_ENDPOINT,
            headers={"Authorization": f"Bearer {GEMINI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": messages,
                "max_tokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
            },
        )

        if response.status_code != 200:
            logger.error(f"Upstream Error {response.status_code}: {response.text}")
            raise HTTPException(status_code=502, detail=f"AI service error: {response.status_code}")

        data = response.json()
        reply = data["choices"][0]["message"]["content"]
        return ChatResponse(reply=reply, session_id=body.session_id)

    except Exception as e:
        logger.exception("Chat endpoint error")
        raise HTTPException(status_code=500, detail=str(e))

# ── Static Serving ───────────────────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

def get_index_path():
    # Try common locations
    paths = [
        os.path.join(STATIC_DIR, "index.html"),
        os.path.join(STATIC_DIR, "client", "index.html"),
    ]
    for p in paths:
        if os.path.isfile(p):
            return p
    return None

@app.get("/{full_path:path}")
async def serve_all(full_path: str):
    if full_path.startswith("api/") or full_path == "health":
        raise HTTPException(status_code=404)
        
    # Try serving the file directly
    file_path = os.path.join(STATIC_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Try client/ subfolder (Vite often puts things there)
    client_file_path = os.path.join(STATIC_DIR, "client", full_path)
    if full_path and os.path.isfile(client_file_path):
        return FileResponse(client_file_path)
        
    # Fallback to index.html
    index = get_index_path()
    if index:
        return FileResponse(index)
        
    return JSONResponse(status_code=404, content={"detail": "Not Found", "path": full_path, "static_dir": STATIC_DIR})
