@echo off
title VoteWise AI Assistant Launcher

echo ===========================================
echo Starting VoteWise AI Assistant
echo ===========================================

echo.
echo [1/2] Starting FastAPI Backend (Port 8000)...
start "VoteWise Backend" cmd /k "cd backend && if not exist venv (python -m venv venv) && call venv\Scripts\activate.bat && pip install -r requirements.txt && python -m uvicorn main:app --reload"

echo.
echo [2/2] Starting React Frontend...
start "VoteWise Frontend" cmd /k "npm run dev"

echo.
echo ===========================================
echo Both services are starting in separate windows.
echo You can close this launcher window.
echo ===========================================
pause
