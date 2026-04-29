from typing import List, Literal
from pydantic import BaseModel, Field, field_validator


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1)

    # FIX #2: List[Message] (not Optional) so it is ALWAYS a list.
    # Sending null/None from the frontend will now fail fast with a clear 422
    # rather than causing a runtime crash deep in the endpoint.
    history: List[Message] = Field(default_factory=list)

    @field_validator("history", mode="before")
    @classmethod
    def coerce_null_to_empty(cls, v):
        # Extra safety: if the frontend accidentally sends null, treat as []
        # instead of raising a validation error.
        return v if v is not None else []


class ChatResponse(BaseModel):
    reply: str
    session_id: str
