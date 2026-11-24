@echo off
title LabelGuard India - SIH26034 Launcher
echo ========================================================
echo   Launching LabelGuard India (Smart India Hackathon 2026)
echo ========================================================
echo.

echo [1/3] Starting Python FastAPI Backend on port 8000...
start "LabelGuard Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Starting React Vite Frontend on port 5173...
start "LabelGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo [3/3] Opening application in your default web browser...
start http://localhost:5173

echo.
echo ========================================================
echo   LabelGuard India is now running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://127.0.0.1:8000/docs
echo ========================================================
pause
