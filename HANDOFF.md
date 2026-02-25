# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-25 (Session 16, checkpoint)
**Active Agent:** Claude Code
**Current Goal:** Run Groq rerun batch (5 sessions) + analyze results

---

## What Was Done This Session

### 1. Bracket Overreach Guard (server/config.py)
- [x] Added second guard clause to `DEFAULT_RPG_SYSTEM_PROMPT` NARRATOR DISCIPLINE section:
  "Do not write labeled [Character]: turns or dialogue blocks for player characters
  inside your narration -- player characters speak for themselves on their own turns."
- This addresses the DM bracket overreach sub-pattern (model-agnostic: confirmed in
  Claude DM ff0721028f50 and Gemini DM ec100713e52b in previous session)

### 2. Groq Rerun Script (rpg_groq_rerun.py)
- [x] Wrote `rpg_groq_rerun.py` -- 5 sessions from stress batch that failed due to Groq TPD
- Sessions:
  1. `p1-vocab-decay-8r-r2` -- P1, 8 rounds, Claude DM, Groq=Kess(Thief)
  2. `p6-claude-player-deepseek-dm-r2` -- P6, 6 rounds, Deepseek DM, Groq=Gruk(Barbarian)
  3. `p9-groq-verbose-poet-r2` -- P9, 5 rounds, Claude DM, Groq=Verse Starlight(Poet)
  4. `p6-claude-player-groq-dm-r2` -- P6, 5 rounds, Groq DM, Claude=Corvus(Warlock)
  5. `p11-deepseek-dm-guard-verify-r2` -- P11-regression, 6 rounds, Deepseek DM, Groq=Ashwood(Scout)
- Session names suffixed with -r2 to distinguish logs from original failed runs
- DB_PATH confirmed correct: `.babel_data/babel.db` (matches server/db.py)

### 3. Groq Developer Rate Limits
- Web search confirms: Developer tier = 10x higher than free tier
- Free tier: 100k tokens/day (TPD) -- what was exhausted in stress batch
- Developer tier: ~500k-1M tokens/day estimated (exact numbers at console.groq.com/settings/limits)
- Per-minute limits also higher
- All 5 failed sessions should complete without hitting TPD limit

### 4. Not Yet Done (blocked by zombie Python at session end)
- [ ] Kill zombie Python processes (use Task Manager -- Stop-Process times out on zombies)
- [ ] Start backend server
- [ ] Run rpg_groq_rerun.py

---

## Pattern Status Summary

| Pattern | Status | Notes |
|---------|--------|-------|
| P1 Vocab persistence 8r | **Deferred** | Clean 8r session still needed; p1-vocab-decay-8r-r2 ready |
| P2 Narrative callbacks | **Confirmed** | -- |
| P4 Voice consistency | **Confirmed** | -- |
| P5 Tension escalation | **Confirmed** | -- |
| P6 Claude player pivots | **Deferred** | 1/3 DMs confirmed (Mistral); Deepseek/Groq reruns ready |
| P7 Adversarial > aligned | **Confirmed** | -- |
| P8 GPT-4o-mini narrates | **Confirmed** | -- |
| P9 Groq brevity | **Deferred** | Rerun ready (p9-groq-verbose-poet-r2) |
| P10 DM character capture | **Confirmed** | Bracket overreach guard now fixed in config.py |
| P11 Phantom NPC | **Deferred** | Regression rerun ready (p11-deepseek-dm-guard-verify-r2) |
| P12 Cooperative drift | **Confirmed** | -- |
| P13 Deception persistence | **Confirmed** | -- |
| P14 Gemini confabulation | Candidate | 1 instance, needs targeted session |

---

## Next Steps (Priority Order)

1. [ ] **Kill zombie Python** -- Task Manager > Details > kill all python.exe (Stop-Process fails on zombies)
2. [ ] **Start server** -- `.venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000`
   Redirect to server_out.log / server_err.log; wait 5s; verify with Invoke-WebRequest
3. [ ] **Run rerun batch** -- `Start-Process -FilePath ".venv\Scripts\python.exe" -ArgumentList "rpg_groq_rerun.py" -WorkingDirectory "C:\Users\User\Repositories\Babel" -RedirectStandardOutput "groq-rerun-output.txt" -RedirectStandardError "groq-rerun-err.txt" -NoNewWindow`
   Estimated runtime: ~60-90 minutes
4. [ ] **Analyze 5 new session logs** -- write Observations sections; update deferred-patterns.md
   - P1: count coined terms R1-2; track which survive to R6-8
   - P6: count Claude pivot moves in deepseek-dm-r2 and groq-dm-r2 sessions
   - P9: measure Groq turn length vs Mistral/Deepseek (brevity still holds under verbose pressure?)
   - P11: any phantom NPCs invented by Deepseek DM despite guard?
5. [ ] **Promotion decisions after analysis**:
   - P6: if 2/3 DMs show Claude pivot behavior, PROMOTE
   - P9: if Groq brevity confirmed, PROMOTE
   - P11: if no phantom NPCs, mark as fixed (like P3)
6. [ ] **Commit all work** -- server/config.py + gameplay-observations/ + session logs + rpg_groq_rerun.py
7. [ ] **Phase 16 smoke tests** (still pending)
8. [ ] **Phase 17 implementation** -- RPG context management; Pre-Flight Injector

---

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Bracket overreach guard in config.py | DONE | Not yet committed |
| rpg_groq_rerun.py written | DONE | Syntax verified (py_compile clean) |
| All 40 session logs have observations | DONE | gameplay-observations/session-logs/ |
| Groq rerun batch run | PENDING | Blocked by zombie Python at session end |
| Phase 16 runtime smoke tests | PENDING | Server not started |
| Commit | PENDING | Many modified/untracked files |

## Status: SESSION 16 CHECKPOINT
Bracket overreach guard fixed. Rerun script ready. Need fresh session to kill zombies + run batch.
Groq dev sub active -- all 5 sessions should complete cleanly.
