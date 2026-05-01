@echo off
title VoteWise AI Assistant Launcher
setlocal

set "ROOT=%~dp0"
set "BACKEND=%~dp0backend"
set "VENV_PY=%~dp0backend\venv\Scripts\python.exe"
set "VENV_PIP=%~dp0backend\venv\Scripts\pip.exe"

echo ===========================================
echo  Starting VoteWise AI Assistant
echo ===========================================

REM Check for backend .env file
if not exist "%BACKEND%\.env" (
    echo.
    echo [WARNING] backend\.env not found!
    echo Copy backend\.env.example to backend\.env and set your GEMINI_API_KEY.
    echo The backend will start but /api/chat calls will fail without the key.
    echo.
)

REM Create venv if it doesn't exist
if not exist "%VENV_PY%" (
    echo [INFO] Creating Python virtual environment...
    python -m venv "%BACKEND%\venv"
)

REM Install requirements into venv (always ensures deps are up to date)
echo [INFO] Checking backend dependencies...
"%VENV_PIP%" install -r "%BACKEND%\requirements.txt" -q

REM Check for frontend node_modules
if not exist "%ROOT%node_modules" (
    echo [INFO] node_modules not found, running npm install first...
    pushd "%ROOT%"
    npm install
    popd
)

echo [1/2] Starting FastAPI Backend (Port 8000)...
REM Resolve port 8000 conflict if another instance is running
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [INFO] Killing existing process on port 8000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)
start "VoteWise Backend" /D "%BACKEND%" cmd /k "%VENV_PY% -m uvicorn main:app --reload --port 8000"

echo.
echo [2/2] Starting React Frontend (Port 5173)...
start "VoteWise Frontend" /D "%ROOT%" cmd /k "npm run dev"

echo.
echo ===========================================
echo  Both services starting in separate windows.
echo  Backend  -^> http://localhost:8000/health
echo  Frontend -^> http://localhost:5173
echo  You can close this launcher window.
echo ===========================================
pause
