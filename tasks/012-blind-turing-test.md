# 012 — Blind Turing Test Export

## Problem
After watching an experiment, users have a general sense of which model "felt" different, but
this is confounded by knowing which speaker is which. A blind test — where speaker labels are
hidden — would reveal whether models are *actually* distinguishable by their outputs alone,
and would build intuitive model literacy.

## Goal
Take a completed experiment and let the user (or a friend) try to correctly attribute each turn
to the right model, without seeing the speaker labels. Report accuracy and surface per-turn
reasoning.

## Proposed Solution

### "Blind Test" button on Theater (completed experiments)
Opens a new view at `/theater/:id/blind`:
- Transcript shown with speaker labels replaced by "Speaker 1" and "Speaker 2".
- User clicks each turn: a mini dropdown appears: "Model A" / "Model B".
- After all turns are guessed: reveal labels + score.
- Score: `correct_guesses / total_turns * 100%`.
- Per-turn feedback: show the real speaker with a checkmark/X and optionally a short note from
  the judge about why that turn was characteristic of that model.

### Judge annotation (optional, async)
On export, optionally fire a background judge call per turn:
  "This turn was written by [model]. What linguistic features give it away?"
Store annotations in a new `turn_annotations` table keyed by (turn_id, annotation_type).
Display in the reveal phase.

### Shareable blind test link
Generate a URL: `/blind/:token` — the token maps to an experiment ID + a shuffle seed that
randomizes which speaker is "1" vs "2". Share with a friend to get their attribution without
meta-information leaking from "I know this is my experiment."

### Aggregate stats (Analytics)
- "How distinguishable are these models?" metric per model pair — average correct attribution
  rate across all blind tests where those two models faced each other.
- Heatmap: model pair matrix with distinguishability scores.

## Alternatives Considered
- **Auto-blind every experiment**: too disruptive; keep as opt-in.
- **Show only one model's turns for attribution**: simpler but loses the comparison dynamic.

## Risks
- Judge annotations per turn are expensive (N LLM calls per experiment) — make them opt-in
  and use Haiku to keep cost low.
- Users can cheat by looking at the normal Theater page; the blind test is self-enforced.
  That's fine — it's a learning tool, not a competition.
- Short experiments (2-3 turns) give too little signal for meaningful attribution.
  Minimum recommendation: 6+ turns. Show a warning if experiment is shorter.

## Files to Modify
- `server/db.py` — `turn_annotations` table; blind test token store
- `server/routers/experiments.py` — `GET /blind/:token` resolve, `POST /blind/:token/annotate`
- `ui/src/pages/BlindTest.tsx` — blind test view (create)
- `ui/src/pages/Theater.tsx` — "Blind Test" button
- `ui/src/pages/Analytics.tsx` — distinguishability heatmap
- `ui/src/App.tsx` — `/blind/:token` and `/theater/:id/blind` routes

## Acceptance Criteria
- [ ] "Blind Test" button appears on completed Theater pages with 6+ turns
- [ ] Blind test view shows turns with anonymized speaker labels
- [ ] User can attribute each turn; submit reveals labels and accuracy score
- [ ] Shareable `/blind/:token` link works without knowing the experiment ID
- [ ] Per-turn judge annotations show (when opted in) after reveal
- [ ] Analytics shows distinguishability score per model pair (requires 3+ blind tests for a pair)
