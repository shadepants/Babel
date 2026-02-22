@echo off
REM Wrapper that ensures node is on PATH for postinstall scripts.
set "PATH=C:\Program Files\nodejs;C:\Users\User\AppData\Roaming\npm;%PATH%"
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" %*
