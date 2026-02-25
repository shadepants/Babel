# BABEL OPERATIONAL AUDIT: Launch & Utility Scripts
**Date:** 2026-02-25  
**Auditor:** Gemini CLI  
**Scope:** `.ps1` and `.cmd` root scripts

---

## 1. High-Risk Issues

### [OPS-001] Indiscriminate Process Termination (`kill_python.ps1` / `run_analysis_runner.ps1`)
- **Problem:** Scripts attempt to kill any Python process older than 5 minutes that isn't explicitly "protected."
- **Impact:** High. Long-form RPG sessions or tournaments can easily exceed 5 minutes. These scripts may kill the very experiments they are meant to support.
- **Proposed Fix:** Use port-based detection. Instead of age, kill processes that are bound to `:8000`.

### [OPS-002] Hardcoded Path Sensitivity
- **Problem:** `run_analysis_runner.ps1` uses absolute paths like `C:\Users\User\Repositories\Babel\...`. 
- **Impact:** High. The scripts will fail if the project is moved or used by another collaborator.
- **Proposed Fix:** Use `$PSScriptRoot` or relative paths (e.g., `.\.venv\Scripts\python.exe`).

### [OPS-003] Redundant Dependency Installation (`share.ps1`)
- **Problem:** Runs `pip install -r requirements.txt` on every launch.
- **Impact:** Medium. Adds 5-15 seconds of latency to every "share" action.
- **Proposed Fix:** Check for a "dirty" state or only run if a specific flag is passed.

---

## 2. Inefficiencies

### [OPS-004] Multi-Window Spawn Overload
- **Problem:** `share.ps1` and `start.cmd` spawn 2-3 separate terminal windows.
- **Impact:** Low/Medium. Clutters the taskbar and makes logs harder to aggregate.
- **Proposed Fix:** Use a process manager like `PM2` (already hinted at by `ecosystem.config.js`) or a single `ConEmu`/`Windows Terminal` profile.

### [OPS-005] Localtunnel Fragility
- **Problem:** `share.ps1` launches `localtunnel` blindly.
- **Impact:** Medium. If the tunnel fails to connect, the backend is running but unreachable, with no error bubble-up to the user.
- **Proposed Fix:** Implement a retry loop or parse the localtunnel output for the "your url is:" string before considering the launch successful.

---

## 3. Summary Table

| ID | Script | Priority | Difficulty | Fix Strategy |
| :--- | :--- | :--- | :--- | :--- |
| OPS-001 | kill_python.ps1 | **P0** | Low | Port-based kill |
| OPS-002 | run_analysis_runner.ps1 | **P0** | Low | Relative paths |
| OPS-003 | share.ps1 | **P2** | Low | Lazy pip install |
| OPS-005 | share.ps1 | **P1** | Medium | LT success check |
