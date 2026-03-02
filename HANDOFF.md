# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-01
**Active Agent:** Claude Code
**Current Goal:** Session 36 complete &mdash; all session 35 work committed + spec 019 implemented and shipped

## Changes This Session

### E2E Smoke Gate
- [x] `npx playwright test e2e/smoke.spec.ts` &mdash; **4/6 passed, 2 skipped** (expected: tests 5/6 need verdict + running experiment in DB; Gemini quota killed our verdicts last session)

### Commits (`3a56f51`, `15d1892`, `d4236c1`)
- [x] **`3a56f51`** `fix(backend+ui)`: summarizer hot_threshold guard, gemini/ prefix, audit dynamic model selection, vocab Unicode symbols + original preset, BOM strips (4 frontend files), preset em-dash fix + suggested model B swap
- [x] **`15d1892`** `docs`: CONTEXT.md s35 state + 15 playground spec files (tasks/005-019)
- [x] **`d4236c1`** `feat(spec-019)`: Model Version Snapshot fully implemented

### Spec 019 Implementation Details
- [x] `server/config.py`: `resolve_model_version(model_string) -> str` &mdash; YYYYMMDD-stamped strings get date extracted; alias strings get `@YYYY-MM-DD` launch proxy. Never raises.
- [x] `server/db.py`: idempotent migration (`model_a_version TEXT`, `model_b_version TEXT`); `create_experiment()` now accepts both params
- [x] `server/routers/relay.py`: version resolution wired at launch for standard, N-way, and RPG paths; belt-and-suspenders `try/except` ensures launch never fails
- [x] `ui/src/lib/models.ts`: new `formatModelVersion()` helper (60-char cap; `v` prefix for date-stamped, &ldquo;launched&rdquo; for alias)
- [x] `ui/src/api/types.ts`: `model_a_version?` / `model_b_version?` on `ExperimentRecord`
- [x] `ui/src/components/theater/ExperimentHeader.tsx`: `title` tooltip on model A/B badges
- [x] `ui/src/pages/Theater.tsx`: destructures `dbExperiment` from `useTheaterData`; passes versions to header
- [x] `ui/src/pages/Gallery.tsx`: `title` tooltip on model name spans

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| E2E smoke | PASSED (4/6) | 2 skipped: need verdict-bearing + running experiment |
| TypeScript TSC | PASSED | `npx tsc --noEmit` &mdash; zero errors after all changes |
| `resolve_model_version` unit | PASSED | Anthropic date-stamped &rarr; `@2025-10-01`; Gemini alias &rarr; `@2026-03-01` |
| relay.py import | PASSED | `from server.routers.relay import start_relay` imports cleanly |
| Backend server | RUNNING | Port 8000 (preview server still active) |
| Frontend server | RUNNING | Port 5173 (preview server still active) |

## Next Steps

1. [ ] **Implement spec 018** (Baseline Control Preset, ~2hr) &mdash; `server/presets/baseline.yaml` + `baseline_experiment_id` FK column + &ldquo;Run Baseline Comparison&rdquo; button + signed delta panel in Theater. Read `tasks/018-baseline-control-preset.md` first.
2. [ ] **Implement spec 017** (Replication Runs, ~half-day) &mdash; `replication_groups` table + `POST /api/relay/replicate` + Gallery group card with n=X badge. Read `tasks/017-replication-runs.md` first.
3. [ ] **Set `JUDGE_MODEL` in `.env`** to `anthropic/claude-haiku-4-5-20251001` before re-running batch experiments (Gemini quota exhausted; 5 experiments still failed from last session)
4. [ ] **RelayConfig wiring** (long-deferred): wire `RelayConfig` dataclass into `run_relay()` signature + update 4 callers

## Key Commits This Session

| Hash | Description |
|------|-------------|
| `3a56f51` | fix(backend+ui): summarizer guard, gemini prefix, audit dynamic models, vocab Unicode symbols, BOM strips |
| `15d1892` | docs: session 35 CONTEXT update + 15 playground feature specs (tasks/005-019) |
| `d4236c1` | feat(spec-019): model version snapshot -- resolve and store version at launch |

## Build Order Reminder (MCDA-ranked)
019 &#x2705; DONE &rarr; **018 next** (small: 1 YAML + 1 column + 1 button + delta panel) &rarr; 017 (medium: new table + endpoint + UI page)
