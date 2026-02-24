# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23 (Session 8)
**Active Agent:** Claude Code
**Current Goal:** Planning session -- Phase 14+15 comprehensive spec written; no code changed

## What Was Done This Session

### Planning Only (Session 8)
- Read CONTEXT.md, HANDOFF.md, and all modified working-tree files
- Explored relay_engine.py, relay.py, db.py, vocab_extractor.py, Dictionary.tsx, Theater.tsx,
  Configure.tsx, VocabTimeline.tsx, participantColors.ts, ConstellationGraph.tsx, app.py
- Wrote comprehensive Phase 14+15 implementation plan to:
  `~/.claude/plans/sunny-chasing-sutton.md`

### No code changes this session (plan only)

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Phase 12+13 code | DONE but uncommitted | Working tree changes need git commit before Phase 14 |
| Phase 14+15 plan | WRITTEN | ~/.claude/plans/sunny-chasing-sutton.md |
| TypeScript (last known) | PASSED | tsc --noEmit 0 errors (verified end of session 7) |

## Phase 12+13 Uncommitted Files (commit these first)
```
server/relay_engine.py   server/routers/relay.py   server/app.py
ui/src/api/types.ts      ui/src/api/hooks.ts        ui/src/api/client.ts
ui/src/pages/Configure.tsx   ui/src/pages/Dictionary.tsx   ui/src/pages/Theater.tsx
ui/src/components/dictionary/ConstellationGraph.tsx
ui/src/components/dictionary/WordCard.tsx
ui/src/components/dictionary/VocabTimeline.tsx
ui/src/lib/format.ts     ui/src/lib/participantColors.ts
CONTEXT.md  HANDOFF.md   ui/vite.config.ts
```
Suggested message: `feat(phase-12+13): dictionary revamp, pause/resume, human inject, observer model`

## Next Steps (from plan sunny-chasing-sutton.md)

1. [ ] **COMMIT** Phase 12+13 working-tree changes (see list above)
2. [ ] **14-A** VocabBurstChart.tsx -- D3 burst chart in Dictionary (~0.5 day)
   - New file: ui/src/components/dictionary/VocabBurstChart.tsx
   - Modify: ui/src/pages/Dictionary.tsx (import + render below swimlane)
   - Data: GET /api/experiments/:id/stats vocab_by_round (no new backend needed)
3. [ ] **14-B** Experiment forking (~2 days)
   - server/db.py: ALTER TABLE experiments ADD COLUMN parent_experiment_id/fork_from_turn; get_turns_up_to()
   - server/relay_engine.py: initial_history param
   - server/routers/relay.py: fork_from_experiment_id/fork_from_turn in RelayStartRequest
   - ui: types.ts + TurnBubble fork button + Theater onFork handler + Configure fork banner
4. [ ] **14-C** Cross-run vocabulary provenance (~1.5 days)
   - server/db.py: ALTER TABLE vocabulary ADD COLUMN origin_experiment_id; tag_word_origins(); updated get_vocabulary() JOIN
   - server/relay_engine.py: fire tag_word_origins() background task at completion
   - ui: VocabWord type + WordCard provenance badge
5. [ ] **15-A** N-way conversations (~4 days)
6. [ ] **15-B** Branch tree (~2 days)

## Key Patterns (carry forward)

- **SSE-first / DB-fallback**: effectiveX = sseX.length > 0 ? sseX : dbX
- **Idempotent migrations**: try/except on ALTER TABLE ADD COLUMN
- **Background tasks**: asyncio.create_task() + _log_task_exception callback
- **win_write + HTML entities**: never raw Unicode in JSX/TS source files
- **Pause state transient**: asyncio.Event per relay, no DB column
- **Write lock**: db._write_lock wraps ALL db write methods