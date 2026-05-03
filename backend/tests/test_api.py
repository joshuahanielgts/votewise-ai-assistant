import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import sys, os

# Add parent directory to path to allow importing main
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Mock environment variables for testing
os.environ["GEMINI_API_KEY"] = "AIzaSy_test_key"
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_chat_missing_message():
    res = client.post("/api/chat", json={"session_id": "abc"})
    # Pydantic will catch missing 'message' and return 422
    assert res.status_code == 422
    assert "detail" in res.json()

def test_chat_empty_message():
    res = client.post("/api/chat", json={
        "message": "", "session_id": "abc", "history": []
    })
    # Pydantic min_length=1 will catch this
    assert res.status_code == 422

def test_chat_null_history_coerced():
    """history: null should be coerced to [] not raise 422"""
    res = client.post("/api/chat", json={
        "message": "test", "session_id": "abc", "history": None
    })
    # Should not return 422 — null is coerced to [] in schemas.py
    assert res.status_code != 422

@patch("main.http_client")
def test_chat_success(mock_client):
    # Mock the singleton httpx client
    from unittest.mock import MagicMock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Here is your answer."}}]
    }
    mock_client.post = AsyncMock(return_value=mock_response)

    res = client.post("/api/chat", json={
        "message": "How do I vote?",
        "session_id": "test-session",
        "history": []
    })
    assert res.status_code == 200
    assert "reply" in res.json()
    assert res.json()["reply"] == "Here is your answer."
    assert "session_id" in res.json()

def test_cors_preflight():
    res = client.options("/api/chat", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
    })
    assert res.status_code in [200, 204]
    assert "access-control-allow-origin" in res.headers
