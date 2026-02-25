# Detect protected PIDs (MCP servers, uvicorn) -- don't kill these
$protectedPids = Get-WmiObject Win32_Process |
    Where-Object { $_.Name -eq "python.exe" -and (
        $_.CommandLine -like "*windows-safe-tools*" -or
        $_.CommandLine -like "*uvicorn*" -or
        $_.CommandLine -like "*mcp-server*"
    )} | Select-Object -ExpandProperty ProcessId

Write-Host "Protected PIDs (servers): $protectedPids"

# Kill stale Python processes older than 5 min that aren't protected
Get-Process python -ErrorAction SilentlyContinue |
    Where-Object { $_.Id -notin $protectedPids -and $_.StartTime -lt (Get-Date).AddMinutes(-5) } |
    ForEach-Object {
        Write-Host "Killing stale python PID $($_.Id) (started $($_.StartTime))"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        & taskkill /PID $_.Id /F 2>$null
    }
Start-Sleep -Seconds 2

# Launch runner -- Tee so output shows in console AND file
Write-Host "Launching rpg_analysis_runner.py..."
$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$script = Join-Path $PSScriptRoot "rpg_analysis_runner.py"
$outfile = Join-Path $PSScriptRoot "analysis-runner-output.txt"

& $python -u $script 2>&1 | Tee-Object -FilePath $outfile
