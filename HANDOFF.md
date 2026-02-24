# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23 (Session 9)
**Active Agent:** Claude Code
**Current Goal:** Phase 13b complete + DF SIM research applied; ready for RPG smoke test + SAO metadata

## What Was Done This Session

### Phase 13b: Virtual Tabletop RPG Mode (complete, committed fa1ff1b)
- Created `server/rpg_engine.py` (NEW, ~175 lines) -- human-yielding RPG engine
- Added DB migrations (mode, participants_json, metadata columns)
- Added `app.state.human_events = {}` for per-match asyncio.Event registry
- Added `RelayEvent.AWAITING_HUMAN` constant to relay_engine.py
- Updated relay.py: mode branching in POST /start, dual-mode POST /inject
- Added `AwaitingHumanEvent` + `isAwaitingHuman` to frontend types/hooks
- Created `HumanInput.tsx` + `RPGTheater.tsx` (new components)
- Updated Configure.tsx: RPG mode toggle, party member builder
- Updated App.tsx: /rpg/:matchId route, emerald tint
- Fixed 7 GEM spec bugs during implementation (see plan file for details)

### DF SIM Research Applied
- Read all 3 docs in `C:\Users\User\Repositories\DF SIM\`
- Key insight: **SAO logging (Finding #6)** -- Subject-Action-Object event triples with causal chains
  - The `metadata TEXT` column on turns already exists but is unpopulated
  - Prompt DM to emit structured tags, parse on save, enables campaign recap
- **LOD tiers (Finding #4)** map to campaign persistence via model_memory
- **Zero-player game (Finding #5)** validates Babel's architecture (standard relay = zero-player, RPG = one-player)
- Added RPG follow-ups to CONTEXT.md Next Up section

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python syntax | PASSED | py_compile on all 5 backend files |
| TypeScript | PASSED | tsc --noEmit exits 0 |
| Git commit | DONE | fa1ff1b -- 14 files, 927 insertions |
| Runtime test | BLOCKED | Zombie Python processes; kill in Task Manager first |

## Next Steps (Priority Order)

1. [ ] **RPG smoke test** -- kill zombie Python processes in Task Manager, start server, test end-to-end
2. [ ] **RPG SAO metadata** -- prompt DM to emit structured events; parse into metadata column (~0.5 day)
3. [ ] **RPG campaign recap** -- page that reconstructs narrative from SAO metadata (~1 day)
4. [ ] **RPG campaign persistence** -- DM remembers past sessions via model_memory (~1 day)
5. [ ] **Phase 14** -- VocabBurstChart, experiment forking, cross-run provenance

## Key Patterns (carry forward)

- **SSE-first / DB-fallback**: effectiveX = sseX.length > 0 ? sseX : dbX
- **Idempotent migrations**: try/except on ALTER TABLE ADD COLUMN
- **Background tasks**: asyncio.create_task() + _log_task_exception callback
- **win_write + HTML entities**: never raw Unicode in JSX/TS source files
- **RPG human_events**: separate dict from _running_relays; cleanup removes both
- **RPG global perspective**: all participants see full conversation; current speaker = assistant, others = user with [name]: prefix
- **metadata column**: already exists on turns table, ready for SAO structured events
- **DF SIM reference**: `C:\Users\User\Repositories\DF SIM\findings.md` has 6 findings; #4 (LOD) and #6 (SAO) most relevant

## Zombie Python Processes Warning
12+ zombie Python processes from litellm import hangs (Windows Defender scanning .venv).
PowerShell CANNOT kill them. Must use Task Manager > Details > kill all python.exe manually.
After killing, server starts normally. See MEMORY.md for permanent Defender exclusion fix.
