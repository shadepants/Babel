$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$outfile = Join-Path $PSScriptRoot "runner-output.txt"

& $python -u (Join-Path $PSScriptRoot "rpg_runner.py") > $outfile 2>&1
& $python -u (Join-Path $PSScriptRoot "rpg_multi_runner.py") >> $outfile 2>&1
