# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-01
**Active Agent:** Claude Code
**Current Goal:** Session 37 complete &mdash; spec 018 (Baseline Control Preset) fully implemented and shipped

## Changes This Session

### Spec 018 Implementation (`c3848f4`)
- [x] `server/presets/baseline.yaml` &mdash; new control preset with `is_control: true`, 4 rounds, minimal unstructured seed
- [x] `server/db.py` &mdash; idempotent `baseline_experiment_id TEXT` migration; `link_baseline(source_id, baseline_id)` helper
- [x] `server/routers/relay.py` &mdash; `baseline_for_experiment_id` field on `RelayStartRequest`; pre-flight 404 guard; `link_baseline` call after `create_experiment`
- [x] `server/routers/experiments.py` &mdash; `GET /:id/baseline` endpoint: 200 (full record when done), 202 (running), 404 (not linked)
- [x] `ui/src/api/types.ts` &mdash; `is_control?` on `Preset`; `baseline_experiment_id?` on `ExperimentRecord`; `baseline_for_experiment_id?` on `RelayStartRequest`
- [x] `ui/src/api/client.ts` &mdash; `getExperimentBaseline()` method
- [x] `ui/src/pages/SeedLab.tsx` &mdash; baseline card: dashed border, amber (Control) badge, muted colors, measurement hint text
- [x] `ui/src/pages/Theater.tsx` &mdash; &ldquo;// Baseline&rdquo; button on completed non-baseline experiments; 15s polling; vocab/score/rounds delta panel with signed deltas; judge-model mismatch warning; failed-run re-run link
- [x] `ui/src/pages/Gallery.tsx` &mdash; amber CONTROL badge on baseline rows; &ldquo;controls&rdquo; filter toggle (off by default)

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript `tsc --noEmit` | PASSED | Zero errors after all changes |
| Backend import check | PASSED | `baseline_for_experiment_id` field loads; `/baseline` route registered |
| Preset loader | PASSED | `load_presets()` returns `is_control: True` for baseline |
| Frontend visual | PASSED | Baseline card renders with amber CONTROL badge in Seed Lab |
| Backend server | RUNNING | Port 8000 |
| Frontend server | RUNNING | Port 5173 |

## Next Steps

1. [ ] **Implement spec 017** (Replication Runs) &mdash; `replication_groups` table + `POST /api/relay/replicate` + Gallery group card with n=X badge. Read `tasks/017-replication-runs.md` first.
2. [ ] **Set `JUDGE_MODEL`** to `anthropic/claude-haiku-4-5-20251001` in `.env` before re-running batch experiments (Gemini quota exhausted; experiments 01/06/08/09/10 still failed)
3. [ ] **RelayConfig wiring** (long-deferred): wire `RelayConfig` dataclass into `run_relay()` + update 4 callers

## Key Commits This Session

| Hash | Description |
|------|-------------|
| `c3848f4` | feat(spec-018): baseline control preset &mdash; measure treatment effect of any preset |

## Build Order Reminder (MCDA-ranked)
019 &#x2705; DONE &rarr; 018 &#x2705; DONE &rarr; **017 next** (medium: new table + endpoint + Gallery group card)
