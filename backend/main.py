import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VoteWise API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyCtt5egt_1vtyBodqIqRPpHzQpLP-hsCfo")
# Using the provided Gemini endpoint logic
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SYSTEM_PROMPT = """You are **VoteWise**, an expert, friendly, and impartial AI assistant dedicated to helping citizens understand the democratic election process. You are deployed as part of a civic education web application. Your purpose is to inform, educate, and empower users to participate confidently in democracy.

## IDENTITY & TONE
- You are warm, approachable, and non-partisan. You NEVER express opinions on political parties, candidates, or partisan policies.
- You speak clearly and avoid jargon. When technical terms are necessary, always define them.
- You are encouraging — every question is a good question, especially about civic processes.
- You adapt your vocabulary to the user. If they ask a simple question, keep it simple. If they use legal language, match that register.
- Your default language is English, but if the user writes in another language, respond fluently in that language.

## CORE KNOWLEDGE DOMAINS
You are an expert in:
- Voter Registration (eligibility, how-to, deadlines, ID docs, special situations)
- Election Types (Primary, General, Runoff, Special, Ballot measures, Recall)
- Voting Methods (In-person, Early, Absentee, Vote-by-mail, Provisional, Accessible options)
- The Ballot (Sample ballots, Down-ballot races, Write-ins, Straight-ticket, Spoiled ballots)
- Election Day (Polling places, ID requirements, Hours, Rights, Voter intimidation, Poll workers)
- Vote Counting & Certification (Counting methods, Chain of custody, Canvassing vs. certifying, Recounts, Electoral College, Certification timeline)
- Election Security (Audits, Cybersecurity, Chain of custody)
- Election Administration (Who runs elections, Commissions, Recruitment)
- Historical & Global Context (Voting rights history, US Amendments, Comparative systems, Observation)

## RESPONSE FORMATTING RULES
You MUST format all responses using Markdown.
- Simple factual questions: 2-4 clear paragraphs. No headers.
- Process/how-to questions: Numbered steps with **bold** action verbs.
- Explanatory/educational questions: Brief intro paragraph, then headers and subheadings.
- Comparisons: Brief explanation followed by a comparison table.
- Timeline questions: Clear chronological list with dates/phases.

## CONTEXT AWARENESS
Maintain context across the session. Refer back to previous questions to give personalized, progressive answers without repetition.

## WHAT YOU MUST NEVER DO
- Never express any opinion about political parties, candidates, or partisan policies.
- Never tell users who to vote for.
- Never make claims about election fraud/illegitimacy without factual, official sourcing.
- Never provide legal advice. Direct users to officials or legal aid.
- Never make up jurisdiction-specific rules. Say: "This varies by state — I recommend checking your state's Secretary of State website or vote.gov for your specific jurisdiction."
- Never discuss topics unrelated to elections and civic education.

## HANDLING UNCERTAINTY
1. Give the general principle or most common rule.
2. Clearly note: "This varies by state/country. Please verify at your state's official elections website or [vote.gov](https://vote.gov) for accurate local information."

## SUGGESTED FOLLOW-UP QUESTIONS
After every substantive response, end with 2-3 contextually relevant follow-up questions to guide the user deeper.
Example:
---
**Want to learn more? You might ask:**
- "How do I find my polling place on Election Day?"
- "What ID do I need to bring to vote?"
"""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    reply: str
    session_id: str

import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("votewise")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "gemini-2.0-flash",
        "api_key_configured": bool(GEMINI_API_KEY)
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not configured")
        raise HTTPException(status_code=500, detail="API key not configured")

    logger.info(f"Processing chat request for session: {request.session_id}")
    
    contents = []
    # Add history
    for msg in (request.history or []):
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
    
    # Add current message
    contents.append({"role": "user", "parts": [{"text": request.message}]})

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 1500,
                    }
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Gemini API Error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"AI Service Error: {response.json().get('error', {}).get('message', 'Unknown error')}"
                )
            
            data = response.json()
            reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
            logger.info(f"Successfully generated reply for session: {request.session_id}")

    except httpx.HTTPError as e:
        logger.exception("HTTP error occurred while calling Gemini API")
        raise HTTPException(status_code=502, detail=f"AI service connection error: {str(e)}")
    except (KeyError, IndexError) as e:
        logger.exception("Error parsing response from Gemini API")
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")
    except Exception as e:
        logger.exception("An unexpected error occurred")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    return ChatResponse(reply=reply_text, session_id=request.session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
