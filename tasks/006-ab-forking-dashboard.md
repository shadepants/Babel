# 006 — A/B Experiment Forking Dashboard

## Problem
Experiment forking exists but is buried: you fork from the Theater page and land in Configure
with pre-filled fields. There is no way to see two forks side-by-side, no controlled-variable
framing, and no diff of outcomes. Users can't easily run "same experiment, one thing changed"
comparisons — the core of controlled experimentation.

## Goal
Surface forking as a first-class "split test" workflow. Given a completed experiment, let the
user define one variable to change, launch both variants, and see a side-by-side outcome diff.

## Proposed Solution

### "Compare" button on Theater page
- Appears when an experiment is completed.
- Opens a side-by-side config panel: left = original (read-only), right = editable fork.
- A "What changed" summary highlights the single differing field.
- "Run comparison" launches the fork; both are linked as a comparison pair in the DB.

### Backend
- Add `comparison_group_id TEXT` and `comparison_variant INT` columns to `experiments`.
- When a fork is launched from the comparison UI, both experiments share a `comparison_group_id`.
- New endpoint: `GET /api/experiments/{id}/comparison` — returns both experiments in the pair
  with normalized diff data (vocab delta, score delta, winner).

### Comparison View page (`/compare/:group_id`)
- Two Theater-style panels side by side (or stacked on mobile).
- Shared header: "Variable changed: temperature_a (0.7 vs 1.1)"
- Diff metrics bar: vocabulary coined (A: 12, B: 8), avg score (A: 7.2, B: 6.8), winner (A vs B).
- Vocabulary diff table: words unique to A, unique to B, shared.

## Alternatives Considered
- **Allow more than 2 variants**: more powerful but complex UI; defer to v2.
- **Auto-detect changed variable**: parse the two configs and highlight diffs automatically —
  nice-to-have, add after MVP.

## Risks
- Two concurrent experiments double the LLM cost — fine for the user's own experiments, but
  add a warning: "This will run 2 experiments simultaneously."
- Side-by-side Theater playback requires a new view; don't reuse the existing Theater component
  without care (it has SSE subscriptions that assume a single match_id).

## Files to Modify
- `server/db.py` — `comparison_group_id`, `comparison_variant` columns; comparison query
- `server/routers/experiments.py` — `GET /comparison` endpoint
- `server/routers/relay.py` — accept `comparison_group_id` in start request
- `ui/src/pages/Theater.tsx` — "Compare" button
- `ui/src/pages/Compare.tsx` — new page (create)
- `ui/src/App.tsx` — route `/compare/:groupId`

## Acceptance Criteria
- [ ] "Compare" button on completed Theater pages launches the comparison fork flow
- [ ] Both experiments show in a side-by-side view at `/compare/:groupId`
- [ ] "What changed" label correctly names the differing parameter
- [ ] Vocabulary diff table shows A-only, B-only, and shared words
- [ ] Metric bar shows score delta and winner for each variant
