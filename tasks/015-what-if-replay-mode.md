# 015 — "What If" Replay Mode

## Problem
Babel has experiment forking (fork from round N with a different model), but the UI frames it
as a new experiment rather than a counterfactual question. There is no "what would have happened
if..." framing, no side-by-side comparison of the original vs. the fork, and no visualization
of where the timelines diverge.

## Goal
From any completed experiment, pause at any round and ask "what if [variable] had been different
from this point?" Replay continues with the change, and a divergence visualization shows where
the two timelines split and how they evolved differently.

## Proposed Solution

### Round-level timeline scrubber (Theater)
- Add a timeline scrubber to the Theater footer (visible on completed experiments).
- Hovering a round: shows a tooltip "What if...?" with a fork icon.
- Clicking: opens the What-If panel.

### What-If configuration panel
Options for the counterfactual:
1. **Swap agent**: replace model_a with a different model from this round forward.
2. **Change temperature**: alter temperature for one agent.
3. **Inject seed event**: add a new turn (as any speaker) at this point — changes the
   conversational direction.
4. **Enable/disable a feature**: toggle echo detector, scoring, observer from this round.

"Replay from here" launches a fork experiment with `initial_history` = turns up to the
selected round, plus the configured change. The fork uses `parent_experiment_id` and
`fork_at_round` (already supported by the backend).

### Divergence visualization
A new view at `/compare/diverge/:original_id/:fork_id`:
- Shared prefix: rounds 1-N shown once (original history).
- Split point: visual fork icon with label "Agent A swapped to GPT-4.1 here."
- Two branches below: original continues on the left, fork on the right, turn-by-turn.
- Vocabulary diff: words coined after the split, colored by which timeline invented them.
- Tone divergence: if scoring is enabled, show score trajectories for both branches.

### Highlight divergence score
Judge model evaluates the fork: "How differently did the conversation evolve after the change
point?" Score 0-10 for narrative/linguistic divergence. Stored as `divergence_score` on the fork.

## Alternatives Considered
- **Multiple forks from same point**: allows branching tree of what-ifs. Powerful but complex
  to visualize; defer to v2. The current approach supports it via the existing lineage tree.
- **Auto-suggest fork points**: use echo detector data to suggest "high-divergence potential"
  rounds. Nice-to-have; add after MVP.

## Risks
- The shared-prefix display requires interleaving two experiment records by round — query must
  be careful to use `fork_at_round` as the split boundary.
- Divergence visualization is complex; the forking tree page already exists (evolution-tree
  endpoint). Consider extending that view rather than building a new one.
- "What if" framing might encourage running many expensive forks without awareness of cost.
  Show per-fork cost estimate in the panel.

## Files to Modify
- `ui/src/pages/Theater.tsx` — round scrubber + What-If panel
- `ui/src/components/WhatIfPanel.tsx` — counterfactual config panel (create)
- `ui/src/pages/DivergeView.tsx` — divergence visualization (create)
- `server/routers/experiments.py` — `GET /diverge/:original/:fork` comparison data endpoint
- `server/db.py` — `divergence_score` column on experiments
- `server/relay_engine.py` — trigger divergence score evaluation on fork completion
- `ui/src/App.tsx` — `/compare/diverge/:a/:b` route

## Acceptance Criteria
- [ ] Round scrubber appears on completed Theater pages; hovering a round shows "What if?" tooltip
- [ ] What-If panel allows swapping agent, changing temperature, or injecting a turn
- [ ] "Replay from here" launches a fork experiment pre-filled with correct initial_history
- [ ] Divergence view at `/compare/diverge/:a/:b` shows shared prefix + two branches
- [ ] Vocabulary diff correctly attributes post-split words to each timeline
- [ ] Divergence score computed by judge and shown in both Theater pages (original + fork)
