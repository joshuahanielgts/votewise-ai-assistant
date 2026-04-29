import os
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.schemas import ChatRequest, ChatResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")
ANTIGRAVITY_ENDPOINT = os.getenv("ANTIGRAVITY_ENDPOINT", "https://api.antigravity.ai/v1/chat/completions")
MAX_TOKENS           = int(os.getenv("MAX_TOKENS", "1500"))
TEMPERATURE          = float(os.getenv("TEMPERATURE", "0.7"))

# CORS: comma-separated list injected via env var on Cloud Run
# e.g. "http://localhost:5173,https://votewise-frontend-xxxx-uc.a.run.app"
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

SYSTEM_PROMPT = """
You are VoteWise, an expert, friendly, and impartial AI assistant dedicated to
helping citizens understand the democratic election process. You are deployed as
part of a civic education web application.

IDENTITY & TONE
- Warm, approachable, strictly non-partisan.
- Never express opinions on political parties, candidates, or policies.
- Define jargon whenever you use it.
- Adapt vocabulary to the user's register.
- If the user writes in another language, respond in that language.

CORE KNOWLEDGE DOMAINS
Voter registration, election types (primary, general, runoff, special),
voting methods (in-person, early, absentee, VBM, provisional), the ballot,
Election Day procedures, vote counting and certification, the Electoral College,
election security, election administration, voting rights history, and
comparative global voting systems.

RESPONSE FORMATTING (Markdown only)
- Simple facts: 2–4 paragraphs, no headers.
- How-to: numbered steps with **bold** action verbs.
- Explanatory: short intro + ## headers + sub-sections.
- Comparisons: brief explanation + Markdown table.

END EVERY SUBSTANTIVE RESPONSE WITH:
---
**Want to learn more? You might ask:**
- "[contextually relevant follow-up]"
- "[contextually relevant follow-up]"

NEVER
- Express partisan opinions.
- Provide legal advice.
- Fabricate jurisdiction-specific rules you're unsure of — say
  "This varies by state — verify at vote.gov."
""".strip()

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set — /api/chat will fail")
    logger.info("VoteWise backend starting. CORS origins: %s", ALLOWED_ORIGINS)
    yield
    logger.info("VoteWise backend shutting down")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VoteWise API",
    version="1.0.0",
    description="AI-powered election education assistant backend",
    lifespan=lifespan,
)

# IMPORTANT: CORS middleware must be added BEFORE routes
# FIX #1: explicit origins list — wildcard + allow_credentials=True is
# forbidden by the CORS spec and will be blocked by every browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# FIX #4: custom 422 handler — returns a clean "detail" string that the
# frontend toast can display directly instead of a raw Pydantic error array.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    messages = [
        f"{'.'.join(str(p) for p in e['loc'] if p != 'body')}: {e['msg']}"
        for e in errors
    ]
    readable = "Validation error: " + ", ".join(messages)
    logger.warning("422 on %s — %s", request.url, readable)
    return JSONResponse(status_code=422, content={"detail": readable})

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "model": "gemini-2.0-flash"}


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
async def chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured on server")

    # Build message list: history first, then the new user message
    # history is guaranteed List[Message] (never None) thanks to FIX #2 in schemas.py
    messages = [
        {"role": m.role, "content": m.content}
        for m in request.history
    ]
    messages.append({"role": "user", "content": request.message})

    logger.info(
        "session=%s | history_len=%d | message=%.80s",
        request.session_id,
        len(request.history),
        request.message,
    )

    # FIX #3: Antigravity (OpenAI-compatible) format
    # - Authorization: Bearer token (not ?key= query param)
    # - model: "gemini-2.0-flash" (not gemini-1.5-flash)
    # - system prompt as top-level "system" field
    # - response path: choices[0].message.content
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ANTIGRAVITY_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {GEMINI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gemini-2.0-flash",
                    "system": SYSTEM_PROMPT,
                    "messages": messages,
                    "max_tokens": MAX_TOKENS,
                    "temperature": TEMPERATURE,
                },
            )

        if response.status_code != 200:
            body = response.text[:300]
            logger.error("Antigravity %d: %s", response.status_code, body)
            raise HTTPException(
                status_code=502,
                detail=f"AI service returned {response.status_code}: {body}",
            )

        data = response.json()
        reply_text = data["choices"][0]["message"]["content"]

    except httpx.TimeoutException:
        logger.error("Antigravity request timed out for session %s", request.session_id)
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
    except httpx.HTTPError as exc:
        logger.error("Antigravity HTTP error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
    except (KeyError, IndexError) as exc:
        logger.error("Unexpected Antigravity response shape: %s", exc)
        raise HTTPException(status_code=502, detail="Unexpected response format from AI service.")

    return ChatResponse(reply=reply_text, session_id=request.session_id)
