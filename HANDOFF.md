# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23 (Session 9)
**Active Agent:** Claude Code
**Current Goal:** Phase 13b Virtual Tabletop RPG expansion -- fully implemented and committed

## What Was Done This Session

### Phase 13b: Virtual Tabletop RPG Mode (Session 9)
- Pivoted from Phase 14+15 to RPG expansion (smaller scope, ~365 lines vs ~1400)
- Read and adapted GEM spec (`GEM_The_Virtual_Tabletop_expansion.md`) -- fixed 7 bugs
- Created `server/rpg_engine.py` (NEW, ~175 lines) -- human-yielding RPG engine
- Added DB migrations (mode, participants_json, metadata columns)
- Added `app.state.human_events = {}` for per-match asyncio.Event registry
- Added `RelayEvent.AWAITING_HUMAN` constant to relay_engine.py
- Updated relay.py: mode branching in POST /start, dual-mode POST /inject
- Added `AwaitingHumanEvent` + `isAwaitingHuman` to frontend types/hooks
- Created `HumanInput.tsx` (NEW) -- emerald command input bar
- Created `RPGTheater.tsx` (NEW) -- full RPG session view with party roster
- Updated Configure.tsx: RPG mode toggle, party member builder, "Begin Campaign"
- Updated App.tsx: /rpg/:matchId route, emerald tint
- Updated client.ts: injectTurn() accepts optional speaker param

### Committed as Phase 12+13+13b
- Phase 12+13 changes were previously uncommitted; all committed together with Phase 13b

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python syntax | PASSED | py_compile on all 5 modified backend files |
| TypeScript | PASSED | tsc --noEmit exits 0, zero errors |
| Runtime import | BLOCKED | Zombie Python processes (litellm/Defender issue); kill in Task Manager to test |
| Live RPG test | NOT YET | Needs server start + real API keys; deferred to next session |

## GEM Spec Bugs Fixed During Implementation

| Bug | Fix |
|-----|-----|
| `content, latency = await call_model(...)` | Destructure 3 values: `content, latency, tokens` |
| Uses `useRelayStream` hook | Used `useSSE` + `useExperimentState` (Babel's actual pattern) |
| Raw string event types | Used `RelayEvent.AWAITING_HUMAN` constant |
| No cancel_event in rpg_engine | Added cancel_event param + check between turns |
| InjectTurnRequest has match_id body field | Babel uses path param `/{match_id}/inject` |
| round_num=0 in inject | Infer from DB turn count |
| No cleanup of human_events | Added cleanup in _cleanup_rpg callback |

## Next Steps

1. [ ] **Runtime smoke test** -- kill zombie Python processes, start server, test RPG flow end-to-end
2. [ ] **14-A** VocabBurstChart.tsx -- D3 burst chart in Dictionary
3. [ ] **14-B** Experiment forking -- DB migrations, initial_history, fork button
4. [ ] **14-C** Cross-run vocabulary provenance
5. [ ] **15-A** N-way conversations
6. [ ] **15-B** Branch tree

## Key Patterns (carry forward)

- **SSE-first / DB-fallback**: effectiveX = sseX.length > 0 ? sseX : dbX
- **Idempotent migrations**: try/except on ALTER TABLE ADD COLUMN
- **Background tasks**: asyncio.create_task() + _log_task_exception callback
- **win_write + HTML entities**: never raw Unicode in JSX/TS source files
- **Pause state transient**: asyncio.Event per relay, no DB column
- **Write lock**: db._write_lock wraps ALL db write methods
- **RPG human_events**: separate dict from _running_relays; cleanup removes both
- **RPG global perspective**: all participants see full conversation; current speaker = assistant, others = user with [name]: prefix
