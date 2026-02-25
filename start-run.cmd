@echo off
REM Babel long-run launcher -- no reload, safe for 15+ round RPG sessions
cd /d "%~dp0"

echo Starting Babel backend (no-reload, port 8000)...
start "Babel Backend (Run)" cmd /k ".venv\Scripts\python.exe -m uvicorn server.app:app --port 8000"

echo Starting Babel frontend (port 5173)...
start "Babel Frontend" cmd /k "cd ui && run_npm.cmd run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Long-run mode: no hot reload. Restart manually after code changes.
