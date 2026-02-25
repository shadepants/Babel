# kill_python.ps1 -- Force-kill stale Python processes using multiple strategies
# Usage: .\kill_python.ps1          (kills processes older than 5 minutes)
#        .\kill_python.ps1 -All     (kills ALL python.exe processes)
#        .\kill_python.ps1 -Age 30  (kills processes older than 30 minutes)

param(
    [switch]$All,
    [int]$Age = 5,
    [int]$Port = 8000
)

$targetPids = @()

if ($All) {
    $targetPids = (Get-Process python -ErrorAction SilentlyContinue).Id
} elseif ($PSBoundParameters.ContainsKey('Age')) {
    $cutoff = (Get-Date).AddMinutes(-$Age)
    $targetPids = (Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -lt $cutoff }).Id
} else {
    # Default behavior: Kill process on port 8000
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $targetPids = @($conn.OwningProcess)
        Write-Host "Targeting process on port $Port`: $targetPids"
    } else {
        # Fallback to age-based if no port listener found
        $cutoff = (Get-Date).AddMinutes(-$Age)
        $targetPids = (Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -lt $cutoff }).Id
        Write-Host "No process on port $Port. Targeting processes older than $Age min."
    }
}

if ($targetPids.Count -eq 0) {
    Write-Host "No matching Python processes found."
    exit 0
}

Write-Host "Targeting $($targetPids.Count) process(es): $targetPids"
Write-Host ""

foreach ($pid_ in $targetPids) {
    $p = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
    if (-not $p) { continue }
    
    $killed = $false
    Write-Host "Killing PID $pid_ (started $($p.StartTime))..."

    # Strategy 1: Stop-Process -Force (TerminateProcess via .NET)
    try {
        Stop-Process -Id $pid_ -Force -ErrorAction Stop
        $killed = $true
        Write-Host "PID $pid_  [OK] Stop-Process"
    } catch {}

    if (-not $killed) {
        # Strategy 2: taskkill /F (Win32 API, bypasses some .NET limitations)
        $result = & "$env:SystemRoot\System32\taskkill.exe" /F /PID $pid_ 2>&1
        if ($LASTEXITCODE -eq 0) {
            $killed = $true
            Write-Host "PID $pid_  [OK] taskkill /F"
        }
    }

    if (-not $killed) {
        # Strategy 3: WMI terminate
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId=$pid_"
            if ($wmi) {
                $r = $wmi.Terminate()
                if ($r.ReturnValue -eq 0) {
                    $killed = $true
                    Write-Host "PID $pid_  [OK] WMI Terminate"
                }
            }
        } catch {}
    }

    if (-not $killed) {
        # Strategy 4: P/Invoke NtTerminateProcess (kernel-level, skips handle checks)
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NtKill {
    [DllImport("ntdll.dll")]
    public static extern int NtTerminateProcess(IntPtr hProcess, int exitStatus);
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(int access, bool inherit, int pid);
    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr h);
}
"@ -ErrorAction SilentlyContinue
        try {
            $handle = [NtKill]::OpenProcess(0x0001, $false, $pid_)  # PROCESS_TERMINATE
            if ($handle -ne [IntPtr]::Zero) {
                $r = [NtKill]::NtTerminateProcess($handle, -1)
                [NtKill]::CloseHandle($handle) | Out-Null
                if ($r -eq 0) {
                    $killed = $true
                    Write-Host "PID $pid_  [OK] NtTerminateProcess"
                }
            }
        } catch {}
    }

    if (-not $killed) {
        Write-Host "PID $pid_  [FAILED] Process is in uninterruptible kernel wait -- reboot required"
    }
}

Write-Host ""
Write-Host "Remaining Python processes:"
Get-Process python -ErrorAction SilentlyContinue | Select-Object Id, StartTime | Format-Table