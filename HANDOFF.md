# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-03
**Active Agent:** Claude Code (session 43)
**Current Goal:** Spec 006 A/B Forking Dashboard

## Changes This Session

### Commits shipped (1 total)
- [x] `feat(spec-006)` `fc5042d` &mdash; A/B forking comparison dashboard (8 files, 935 insertions)

### What was done
- **DB** &mdash; `comparison_group_id TEXT` + `comparison_variant INTEGER` columns added via idempotent migration; `set_comparison_group()` and `get_comparison_group_experiments()` helpers in `db.py`
- **POST /api/relay/compare** &mdash; new endpoint in `routers/relay.py`; forks a completed experiment with one override (model, temperature, rounds, system_prompt); links source as variant 0 and fork as variant 1; launches fork relay with same config
- **GET /api/experiments/{id}/comparison** &mdash; new endpoint in `routers/experiments.py`; works on either experiment in the pair; returns both experiments + vocab diff (a_only/b_only/shared) + auto-detected changed field; supplements each experiment with vocab_count + avg_score
- **types.ts** &mdash; `comparison_group_id/variant` on `ExperimentRecord`; new `ComparisonData`, `ComparisonExperiment`, `RelayCompareRequest`, `CompareStartResponse` types
- **client.ts** &mdash; `api.startComparison()` + `api.getComparison()` methods
- **Theater.tsx** &mdash; `// Compare` button on completed-experiment action bar; inline setup panel (field select dropdown + value input, lazy model list load, number/select inputs per field); `// View Compare` link when experiment already has comparison_group_id; `compareToast` for error feedback; navigate to `/compare/:source_id` on success
- **Compare.tsx** (NEW) &mdash; `/compare/:experimentId` page; side-by-side experiment cards (status, models, temps, vocab/score/winner metrics, links); metric diff bar; vocabulary diff table (A-only / B-only / shared); 8s polling while fork is running

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED | Zero errors |
| Python imports | PASSED | relay, experiments, db all import cleanly |

## Next Priorities (in recommended order)

1. **Live E2E smoke test of Spec 006** *(QA, ~30min)*
   - Run an experiment, go to Theater, click Compare, change temperature, run comparison
   - Verify Compare page shows both experiments + vocab diff + changed field label
   - Optionally add Playwright test to features suite

2. **Live E2E smoke test of Spec 005** *(QA, ~30min)*
   - Run experiment with hypothesis; verify Gallery badge + Theater panel shows result

3. **Push to origin** *(Ops, 2min)*
   - 27 commits ahead of origin/master

4. **New specs** *(Design, any length)*
   - Run `/spec` to draft next playground feature
   - Candidates: persistent vocab dictionary, model personality profiles, experiment tagging

## Session Log Entry
Session 43: Shipped Spec 006 A/B Forking Dashboard end-to-end. 935 insertions across 8 files. Full stack: DB migration, two new API endpoints, Compare.tsx page, Theater Compare button + setup panel. TypeScript zero errors, Python imports clean.
