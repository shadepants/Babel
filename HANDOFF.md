# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-03
**Active Agent:** Claude Code (session 43 complete)
**Current Goal:** Spec 006 A/B Forking Dashboard &mdash; shipped and verified

## Changes This Session

### Commits shipped (2 total)
- [x] `feat(spec-006)` `fc5042d` &mdash; A/B forking comparison dashboard (8 files, 935 insertions)
- [x] `fix(ui)` `5d9fea3` &mdash; effectiveStatus fallback for Theater completed action bar

### What was done
- **DB** &mdash; `comparison_group_id TEXT` + `comparison_variant INTEGER` columns added via idempotent migration; `set_comparison_group()` and `get_comparison_group_experiments()` helpers in `db.py`
- **POST /api/relay/compare** &mdash; new endpoint in `routers/relay.py`; forks a completed experiment with one override (model, temperature, rounds, system_prompt); links source as variant 0 and fork as variant 1; launches fork relay with same config
- **GET /api/experiments/{id}/comparison** &mdash; new endpoint in `routers/experiments.py`; works on either experiment in the pair; returns both experiments + vocab diff (a_only/b_only/shared) + auto-detected changed field; supplements each experiment with vocab_count + avg_score
- **types.ts** &mdash; `comparison_group_id/variant` on `ExperimentRecord`; new `ComparisonData`, `ComparisonExperiment`, `RelayCompareRequest`, `CompareStartResponse` types
- **client.ts** &mdash; `api.startComparison()` + `api.getComparison()` methods
- **Theater.tsx** &mdash; `// Compare` button on completed-experiment action bar; inline setup panel (field select + value input, lazy model list, number/select per field); `// View Compare` link when experiment already has comparison_group_id; `effectiveStatus` fallback to `dbExperiment.status` so action bar renders for old experiments
- **Compare.tsx** (NEW) &mdash; `/compare/:experimentId` page; side-by-side experiment cards (status, models, temps, vocab/score/winner metrics, links); metric diff bar; vocabulary diff table (A-only / B-only / shared); 8s polling while fork is running

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED | Zero errors |
| Python imports | PASSED | relay, experiments, db all import cleanly |
| Theater `// Compare` button visible | PASSED | Confirmed via browser screenshot |
| Compare setup panel opens | PASSED | Correct field + pre-populated current value |
| Fork launches + navigates to `/compare/:id` | PASSED | `window.location.pathname === '/compare/6bc944a3945c'` |
| Compare page renders | PASSED | Side-by-side cards, "Variable changed: Temperature A (0.8 &rarr; 1.2)", metric diff section |

## Next Priorities (in recommended order)

1. **Live E2E smoke test of Spec 005** *(QA, ~30min)*
   - Run experiment with hypothesis; verify Gallery badge + Theater panel shows result

2. **New specs** *(Design, any length)*
   - Run `/spec` to draft next playground feature
   - Candidates: persistent vocab dictionary, model personality profiles, experiment tagging

3. **Push to origin** *(Ops, 2min)*
   - 28 commits ahead of origin/master

## Session Log Entry
Session 43: Shipped Spec 006 A/B Forking Dashboard full stack + verified end-to-end in browser; also fixed effectiveStatus fallback so Theater completed action bar works for old experiments after server restart.
