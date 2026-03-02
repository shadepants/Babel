# 005 — Hypothesis Testing Mode

## Problem
Babel experiments are currently observational — you watch what happens but have no structured way
to predict, test, or record whether your intuitions about model behavior are correct. This limits
learning to vibes rather than the scientific method.

## Goal
Before an experiment runs, the user states a falsifiable hypothesis. After it completes, Babel
evaluates whether the hypothesis held (using the judge model + outcome data) and records the
result in a personal predictions database. Over many experiments, users build real evidence about
how models behave.

## Proposed Solution

### UI (Configure page)
- Add an optional "Hypothesis" textarea below the experiment config.
- Placeholder: "e.g., The reasoning model will coin more vocabulary than the chat model."
- On submit, hypothesis is stored alongside the experiment record.

### Backend
- Add `hypothesis TEXT` column to the `experiments` table (idempotent ALTER TABLE).
- When an experiment completes and a hypothesis exists, fire a background judge call:
  - Prompt: "Given this conversation summary and outcome data [winner, vocab count, scores],
    did this hypothesis hold? Answer: CONFIRMED / REFUTED / INCONCLUSIVE + one sentence why."
- Store result in `hypothesis_result TEXT` and `hypothesis_reasoning TEXT` columns.

### Analytics / Gallery
- Gallery cards show a small badge (CONFIRMED / REFUTED / INCONCLUSIVE) when a hypothesis exists.
- New Analytics panel: "Prediction Accuracy" — pie chart of your historical hypothesis outcomes.
- Sortable/filterable by hypothesis status.

## Alternatives Considered
- **Manual self-rating**: user marks confirmed/refuted themselves — simpler but less objective.
- **No LLM eval, just rule-based**: check "did model_a win?" against "I think A will win" —
  too narrow, most hypotheses are richer than a single field.

## Risks
- Judge may consistently mark hypotheses as INCONCLUSIVE for vague statements — needs prompt
  engineering to push toward decisive verdicts.
- Adds one async LLM call per experiment (low cost with Haiku as judge, but non-zero).
- Users may write unfalsifiable hypotheses ("the models will be interesting") — no clean solution,
  just show a UI hint: "Make it specific and falsifiable."

## Files to Modify
- `server/db.py` — migrations + `save_hypothesis`, `save_hypothesis_result` helpers
- `server/routers/relay.py` — accept `hypothesis` field in `RelayStartRequest`
- `server/relay_engine.py` — trigger hypothesis eval on completion
- `ui/src/pages/Configure.tsx` — hypothesis textarea
- `ui/src/pages/Gallery.tsx` — badge on cards
- `ui/src/pages/Analytics.tsx` — prediction accuracy panel

## Acceptance Criteria
- [ ] User can type a hypothesis before launching an experiment
- [ ] After completion, hypothesis is evaluated by judge model within 30 seconds
- [ ] Result (CONFIRMED/REFUTED/INCONCLUSIVE + reasoning) is visible on Theater and Gallery
- [ ] Analytics shows aggregate prediction accuracy across all experiments
- [ ] Works on existing experiments (hypothesis_result=NULL means no hypothesis was set)
