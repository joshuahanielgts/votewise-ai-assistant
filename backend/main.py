import os
import json
import logging
import sys
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.schemas import ChatRequest, ChatResponse

# ── Structured Logging ────────────────────────────────────────────────────────
class CloudRunFormatter(logging.Formatter):
    """Outputs JSON structured logs that Google Cloud Logging understands."""
    def format(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "component": record.name,
            "logger": record.name,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(CloudRunFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
logger = logging.getLogger("votewise")

# ── Load Config ───────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY")
MAX_TOKENS           = int(os.getenv("MAX_TOKENS", "1500"))
TEMPERATURE          = float(os.getenv("TEMPERATURE", "0.7"))
ANTIGRAVITY_ENDPOINT = os.getenv("ANTIGRAVITY_ENDPOINT", "https://api.antigravity.ai/v1/chat/completions")
MODEL                = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:8081"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── Lifespan (Efficiency: Connection Pooling) ────────────────────────────────
http_client: httpx.AsyncClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    logger.info("Initializing VoteWise backend...")
    http_client = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=20))
    yield
    await http_client.aclose()
    logger.info("Shutting down VoteWise backend...")

# ── Rate Limiting (Security) ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="VoteWise API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL}

@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest):
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not configured")
        raise HTTPException(status_code=500, detail="Gemini API Key missing")

    try:
        # Prepare messages in OpenAI format
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in body.history:
            messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": body.message})

        if http_client is None:
            raise HTTPException(status_code=500, detail="HTTP client not initialized")

        response = await http_client.post(
            ANTIGRAVITY_ENDPOINT,
            headers={
                "Authorization": f"Bearer {GEMINI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": messages,
                "max_tokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
            },
        )

        if response.status_code != 200:
            err_body = response.text[:300]
            logger.error("Upstream API error %d: %s", response.status_code, err_body)
            raise HTTPException(status_code=502, detail=f"AI service returned {response.status_code}")

        data = response.json()
        reply_text = data["choices"][0]["message"]["content"]

        return ChatResponse(reply=reply_text, session_id=body.session_id)

    except httpx.TimeoutException:
        logger.error("Upstream API timeout")
        raise HTTPException(status_code=504, detail="AI service timed out")
    except Exception as e:
        logger.exception("Unexpected error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e))

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
