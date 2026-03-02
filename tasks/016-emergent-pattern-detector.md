# 016 — Emergent Pattern Detector

## Problem
After running many experiments, insights are locked inside individual experiment records.
There is no cross-experiment analysis: no way to know if GPT-4.1 systematically coins more
vocabulary in conlang presets, or if echo chambers develop faster at high temperatures, or
which model pairs produce the most distinctive vocabulary. All of this data exists in the DB
but is invisible.

## Goal
An analytics engine that runs nightly (or on-demand) across all completed experiments,
surfaces statistically supported cross-experiment patterns, and presents them in a
"Pattern Feed" — an insight digest the user can browse, confirm, or dismiss.

## Proposed Solution

### Pattern types to detect (rule-based, no LLM needed)

**Model behavior patterns:**
- "Model X coins significantly more vocabulary than Model Y in [preset] experiments"
  (t-test on vocab_count grouped by model, preset)
- "Model X wins [N]% of experiments against Model Y" (win rate matrix)
- "Model X's turns are [N]% longer on average than Model Y's" (avg turn token count)

**Parameter sensitivity patterns:**
- "Temperature > 1.0 correlates with [N]x more vocabulary convergence" (Jaccard vs temp)
- "Experiments with observer model produce [N]% higher avg scores" (score vs has_observer)

**Temporal patterns:**
- "Vocabulary coining rate peaks in rounds 2-4 and drops after" (per-round vocab rate)
- "Echo chamber warning triggered more often in [preset] experiments" (echo event count by preset)

**Surprise patterns (LLM-assisted):**
- "In [N] experiments, the model that coined fewer words still won the verdict"
  (vocab count vs winner correlation inversion)

### Pattern store
- New `patterns` table: (id, pattern_type, description, evidence_json, confidence_score,
  experiment_count, first_seen_at, last_confirmed_at, dismissed_at).
- Patterns computed by `pattern_engine.py` — pure Python, SQL aggregations, no LLM.
- LLM used only for: generating a human-readable summary of statistically confirmed patterns.

### Pattern Feed UI (`/insights`)
- Card feed: each pattern is a card with title, confidence bar, evidence snippet.
- Evidence snippet: "Observed in 12/15 experiments featuring GPT-4.1 in conlang."
- Actions: "Dismiss" (hide this pattern), "Test this" (opens Configure pre-filled to test
  the pattern hypothesis — links to spec 005), "See experiments" (filtered gallery).
- Runs on-demand ("Refresh insights") or auto after every 5th completed experiment.

### Minimum data requirements
Patterns require at least 5 experiments meeting the filter criteria. Patterns with < 5
experiments show as "emerging" (dimmed card, no confidence score).

## Alternatives Considered
- **LLM-only pattern detection**: ask the judge to read all experiment summaries and name
  patterns. Expensive, hallucination-prone. Use rule-based SQL as the source of truth;
  LLM only for prose summary.
- **Real-time streaming patterns**: update patterns after every experiment. Too expensive for
  MVP; batch compute is sufficient.
- **User-defined pattern queries**: SQL-like filter builder. Powerful but complex; defer to v2.

## Risks
- Statistical claims require minimum sample sizes — with < 20 experiments, most patterns will
  be "emerging" and the feature looks thin. Need to set appropriate expectations.
- False positive patterns with small N are misleading. Enforce minimum N=5, show confidence
  interval, and label patterns as "preliminary" until N=15.
- "Win rate" is a confounded metric (models play different presets, different temperatures).
  Always stratify: "Win rate in [preset], [temp range]." Never report raw cross-preset win rate
  as meaningful.

## Files to Modify
- `server/db.py` — `patterns` table; aggregate query helpers for each pattern type
- `server/pattern_engine.py` — batch pattern computation (create)
- `server/routers/insights.py` — `GET /api/insights`, `POST /api/insights/refresh`,
  `DELETE /api/insights/:id` (create)
- `server/app.py` — mount insights router; schedule pattern refresh every 5 completions
- `ui/src/pages/Insights.tsx` — pattern feed (create)
- `ui/src/components/PatternCard.tsx` — individual pattern card (create)
- `ui/src/App.tsx` — `/insights` route

## Acceptance Criteria
- [ ] Pattern engine runs on-demand and populates `patterns` table from SQL aggregations
- [ ] At least 4 pattern types are detected and stored (model win rate, vocab rate, echo rate,
      score vs observer)
- [ ] Insights page shows pattern cards with confidence score and evidence snippet
- [ ] "Test this" action pre-fills Configure with a hypothesis derived from the pattern
- [ ] "See experiments" filters Gallery to only experiments that constitute the pattern's evidence
- [ ] Patterns with < 5 experiments shown as "emerging" with no confidence score
- [ ] Auto-refresh triggers after every 5th completed experiment (background task)
