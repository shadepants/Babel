@echo off
REM Babel backend smoke test
REM Run after code changes to catch syntax/import errors before starting the server.
REM Motivated by the summarizer_engine.py literal-newline incident that killed the server on startup.
cd /d "%~dp0"

echo [1/2] Checking syntax (compileall)...
.venv\Scripts\python.exe -m compileall server -q
if %errorlevel% neq 0 (
    echo FAIL: Syntax error in server/ -- fix before starting.
    exit /b 1
)

echo [2/2] Checking imports (server.app)...
.venv\Scripts\python.exe -c "import server.app; print('  import OK')"
if %errorlevel% neq 0 (
    echo FAIL: Import error in server.app -- fix before starting.
    exit /b 1
)

echo.
echo Backend OK -- safe to start.
