# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23 (Session 10)
**Active Agent:** Claude Code
**Current Goal:** Phase 14 complete; commit pending + RPG smoke test + Phase 15

## What Was Done This Session

### Phase 14-A: VocabBurstChart
- Created `ui/src/components/dictionary/VocabBurstChart.tsx` (NEW)
  - Pure-SVG per-round vocabulary coinage bar chart
  - Burst detection: rounds where count > mean + 1.5sigma highlighted amber
  - Hover tooltip lists all words coined in that round; click bar calls onSelectWord
  - ResizeObserver for responsive width
- Updated `ui/src/pages/Dictionary.tsx`: added `'burst'` to ViewMode + 4th tab button

### Phase 14-B: Experiment Forking
- `server/db.py`: 2 idempotent migrations (parent_experiment_id TEXT, fork_at_round INTEGER); create_experiment() stores both
- `server/relay_engine.py`: initial_history + parent_experiment_id params; pre-populates turns[] before loop
- `server/routers/relay.py`: 3 new fields on RelayStartRequest; forwarded to db + relay
- `ui/src/api/types.ts`: fork fields on ExperimentRecord + RelayStartRequest
- `ui/src/pages/Theater.tsx`: Fork button (visible when status completed or stopped)
- `ui/src/pages/Configure.tsx`: ?fork= param; forkHistory state; fork banner; launch body includes fork fields

### Phase 14-C: Cross-Run Vocabulary Provenance
- `server/db.py`: origin_experiment_id migration on vocabulary; tag_word_origins() bulk UPDATE (LOWER case-insensitive)
- `server/relay_engine.py`: asyncio.create_task(tag_word_origins()) at end when parent set
- `ui/src/api/types.ts`: origin_experiment_id on VocabWord
- `ui/src/components/dictionary/WordCard.tsx`: [INHERITED] badge links to /analytics/:origin_experiment_id

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python syntax | PASSED | py_compile on db.py, relay_engine.py, routers/relay.py |
| TypeScript | PASSED | tsc --noEmit exits 0, zero errors |
| Runtime test | NOT RUN | Server not started this session |
| Git commit | PENDING | Phase 14 changes not yet committed |

## Next Steps (Priority Order)

1. [ ] **Commit Phase 14** -- 9 files: VocabBurstChart.tsx (new), Dictionary.tsx, server/db.py,
       server/relay_engine.py, server/routers/relay.py, ui/src/api/types.ts,
       Theater.tsx, Configure.tsx, WordCard.tsx
2. [ ] **RPG smoke test** -- kill zombie Python processes in Task Manager first, then start server, test RPG + standard flow
3. [ ] **Phase 15-A** -- N-way conversations (N-agent relay loop, N columns in Theater, N-model selector)
4. [ ] **Phase 15-B** -- Branch tree (/tree/:id, D3 BranchTree, lineage endpoint)
5. [ ] **RPG SAO metadata** -- prompt DM to emit SAO events; parse into metadata column (DF SIM Finding #6)

## Key Patterns (carry forward)

- **SSE-first / DB-fallback**: effectiveX = sseX.length > 0 ? sseX : dbX
- **Idempotent migrations**: try/except on ALTER TABLE ADD COLUMN
- **Background tasks**: asyncio.create_task() + _log_task_exception callback
- **win_write + HTML entities**: never raw Unicode in JSX/TS source files
- **Forking**: initial_history pre-populates turns[] before relay loop; parent_experiment_id passed to db.create_experiment() + tag_word_origins()
- **VocabBurstChart**: pure SVG bars (no D3 lifecycle); ResizeObserver width; burst = mean + 1.5sigma
- **tag_word_origins**: dynamic IN (?,?,?) placeholders; case-insensitive LOWER() match; background task only when parent set
- **RPG human_events**: separate dict from _running_relays; cleanup removes both
- **metadata column**: already exists on turns table, ready for SAO structured events (RPG follow-up)
- **DF SIM reference**: C:\Users\User\Repositories\DF SIM\findings.md -- #4 (LOD tiers) + #6 (SAO events) most relevant for RPG

## Zombie Python Processes Warning
12+ zombie Python processes from litellm import hangs (Windows Defender scanning .venv).
PowerShell CANNOT kill them. Must use Task Manager > Details > kill all python.exe manually.
After killing, server starts normally. See MEMORY.md for permanent Defender exclusion fix.
