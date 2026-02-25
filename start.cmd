@echo off
REM Babel dev launcher -- starts backend + frontend in separate windows
cd /d "%~dp0"

echo Starting Babel backend (port 8000)...
start "Babel Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000 --reload-exclude \"*.log\" --reload-exclude \"*.db*\" --reload-exclude \"_*.py\" --reload-exclude \"runner_live.log\""

echo Starting Babel frontend (port 5173)...
start "Babel Frontend" cmd /k "cd ui && run_npm.cmd run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Both servers running in separate windows.
