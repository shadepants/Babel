# 011 — Spectator Mode / Live Betting

## Problem
Watching a live experiment is passive. The UI shows turns as they stream in, but there is no
mechanism to build intuition about model behavior through active engagement. Users can't test
their predictions in real-time or develop a felt sense of which models tend to "win" and why.

## Goal
A live spectator overlay during running experiments that shows real-time analytics (convergence,
score trajectory, vocabulary growth) and lets users place a "bet" on the outcome before results
are in — gamifying the observation and building calibrated intuition.

## Proposed Solution

### Live Metrics Sidebar (Theater, running experiments)
Streams alongside the conversation in real-time (powered by existing SSE events):
- **Convergence meter**: Jaccard similarity between each agent's last-N turn vocabulary.
  Visual: horizontal bar from "Divergent" to "Echo Chamber".
- **Score trajectory**: mini line chart — per-agent cumulative score over rounds.
- **Vocabulary momentum**: words coined this round vs last round (acceleration indicator).
- **Turn length delta**: are agents getting more verbose or more terse? (engagement signal)

All metrics computed client-side from SSE events already being received. No new backend work.

### Betting Panel
Shown only before the experiment completes and while it is still running.
- Prompt: "Who do you think wins this experiment?"
- Options: Agent A / Agent B / Tie
- One click locks in the prediction.
- After the verdict is in: show result with a "Correct!" / "Wrong" badge and a streak counter
  ("You've predicted 7/10 correctly").
- Streaks stored in localStorage (no user account needed).

### Leaderboard (optional v2)
If multi-user mode is ever added, show a global leaderboard of prediction accuracy by model pair.

## Alternatives Considered
- **Points / currency system**: adds motivation but also complexity and skinner-box mechanics
  that feel cheap. Keep it about calibration, not reward.
- **Betting before launch (not during)**: simpler but loses the "mid-experiment drama" feeling.
  Allow both: lock-in during round 1, update confidence during the run.

## Risks
- Real-time metrics computed client-side require enough SSE event data to be useful —
  validate that score events and turn events carry sufficient data for client-side Jaccard calc.
- Convergence meter duplicates echo detector UI — differentiate clearly (echo detector is a
  *warning*, convergence meter is an *observation*).
- Streak tracking in localStorage is lost on browser clear — fine for MVP.

## Files to Modify
- `ui/src/pages/Theater.tsx` — add live metrics sidebar and betting panel
- `ui/src/components/LiveMetrics.tsx` — new component (create)
- `ui/src/components/BettingPanel.tsx` — new component (create)
- `ui/src/lib/metrics.ts` — client-side Jaccard + score trajectory computation (create)
- No backend changes required for MVP.

## Acceptance Criteria
- [ ] Convergence meter updates after every turn in a running experiment
- [ ] Score trajectory chart updates as judge scores arrive via SSE
- [ ] User can place a bet on A/B/Tie during a running experiment (before completion)
- [ ] Bet result (correct/wrong) shown immediately after verdict is in
- [ ] Streak counter persists across page reloads via localStorage
- [ ] Metrics sidebar is hidden when experiment is completed (replace with final stats)
