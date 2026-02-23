# Babel --- Session Handoff

**Last updated:** 2026-02-23 (session 3)
**Session work:** Unblocked server; verified 11 presets + 4 game-theory presets browser-confirmed; Last-Event-ID code-verified; Prisoner's Dilemma ran end-to-end

---

## What Changed This Session

- [x] **server/app.py** --- LITELLM_LOCAL_MODEL_COST_MAP patch verified working (server starts clean, serves all 11 presets)
- [x] **4 game-theory presets added** --- collab-svg, prisoners-dilemma, syntax-virus, taboo-artifact (11 total, up from 7)
- [x] **SeedLab verified** --- 11 preset cards load; "game-theory" tag filter shows exactly 4
- [x] **Configure pages verified** --- all 4 game-theory presets: metadata, param sliders, model pairings load correctly
- [x] **SSE Last-Event-ID code-verified** --- event_hub.py confirmed: subscribe(last_event_id=N) skips events with id <= N; relay emits id: N+1 on reconnect
- [x] **Prisoner's Dilemma end-to-end** --- full experiment ran; both models chose COOPERATE
- [x] **tasks/003-per-participant-temperature.md** --- task file added (feature already shipped)
- [x] **tasks/004-backboard-memory-spike.md** --- investigation task spec added (pending)
- [x] **ui/src/lib/format.ts, prefs.ts, symbols.ts** --- utility libs committed

---

## Verification Status

**Server: UP** --- started after user killed zombie Python processes via Task Manager.

API verified:
- `GET /api/presets` returns 11 items (7 original + 4 game-theory)
- SeedLab: 11 cards render; tag chip "game-theory" filters to exactly 4

Browser verified (Playwright):
- All 4 game-theory Configure pages load with correct metadata + params + model pairings
- Prisoner's Dilemma: 10-round experiment ran end-to-end; both models COOPERATE outcome

SSE Last-Event-ID:
- `subscribe(last_event_id=N)` skips event_ids <= N, returns N+1 onward --- confirmed in event_hub.py + relay.py
- History endpoint `/api/relay/history` confirmed 21 events stored for a match
- Browser reconnect mid-experiment (manual test) --- still pending (see Open Items)

---

## Open Items (priority order)

1. [ ] **Task 004** --- Backboard.io memory spike: persistent model memory across experiments (`tasks/004-backboard-memory-spike.md`)
2. [ ] **Browser smoke test** --- Last-Event-ID reconnect: start The Original (15 rounds), DevTools Network tab -> Offline mid-stream, re-enable, confirm only missed turns replay
3. [ ] **Claude Code restart** --- SHELL env var already set to `C:\Program Files\Git\bin\sh.exe`; hooks will work after next restart (debug log should show `Using bash path: .../bin/sh.exe`)
4. [ ] **Side-by-side comparison view** --- Phase 6b, deferred (8-12h estimate)

---

## Notes for Next Session

**If server hangs on start:**
1. Zombie Python processes accumulated again. Open Task Manager (Ctrl+Shift+Esc) -> Details tab -> kill all python.exe. PowerShell/taskkill cannot kill these (uninterruptible kernel wait).
2. If not yet done: add `.venv` to Windows Defender exclusions (Windows Security -> Virus & threat protection -> Exclusions -> Add folder: `C:\Users\User\Repositories\Babel\.venv`)
3. `server/app.py` patch (`LITELLM_LOCAL_MODEL_COST_MAP=True`) is already in place --- no code change needed.

**Hooks still broken this session** (fixed after restart):
- SHELL env var set: `[System.Environment]::SetEnvironmentVariable("SHELL", "C:\Program Files\Git\bin\sh.exe", "User")`
- Restart Claude Code to activate. Verify: debug log line ~5 should read `Using bash path: .../bin/sh.exe`
