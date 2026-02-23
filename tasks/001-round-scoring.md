# Task 001 — Round-by-Round Scoring System

**Status:** [x] Done — 2026-02-23  
**Priority:** High  
**Source:** CLAUDE INSIGHT RESEARCH — C-009 (promptheone.com), report insights-2026-02-22-1.md  
**Added:** 2026-02-22

---

## Problem

Babel experiments run N rounds, but there is no per-round evaluation. The only feedback loop is the vocabulary extractor (invented words). Observers can't tell *which rounds* were most generative, where a conversation peaked, or when it stalled. Promptheone.com solves this with round-by-round scoring — a separate scoring pass after each turn.

## Goal

After each relay turn, score that round on 1–4 criteria (creativity, coherence, engagement, novelty) and persist the scores. Surface them in the Theater (live) and Analytics (post-hoc) views.

## Acceptance Criteria

- [ ] Each turn row in the DB has optional score fields (or a separate `turn_scores` table)
- [ ] Scoring is non-blocking — the relay loop continues immediately; scoring happens async
- [ ] Theater shows a score badge per turn bubble (appears after score arrives via SSE)
- [ ] Analytics page shows per-round score trends (line chart, one series per criterion)
- [ ] Scores are included in the JSON/markdown export

---

## Current State

**DB schema:** `turns` table has: `id, experiment_id, model, turn_number, content, thinking, token_count, latency_ms, created_at, vocab_words`  
**SSE events:** `relay.turn` (turn data), `relay.vocab` (vocab list)  
**Analytics:** VocabGrowthChart + LatencyChart — both D3, both in `ui/src/components/analytics/`

## Desired State

- New `turn_scores` table (or nullable columns on `turns`): `turn_id, creativity, coherence, engagement, novelty, scored_at`
- New `relay.score` SSE event type emitted after scoring completes
- Theater `TurnBubble.tsx` renders score badge when `relay.score` arrives for that turn
- Analytics `RoundScoreChart.tsx` — D3 line chart, 4 criteria series, one point per turn

---

## Implementation Steps

### Backend

1. **DB migration** — add `turn_scores` table to `db.py`:
   ```sql
   CREATE TABLE IF NOT EXISTS turn_scores (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     turn_id INTEGER NOT NULL REFERENCES turns(id),
     creativity REAL,
     coherence REAL,
     engagement REAL,
     novelty REAL,
     scored_at TEXT DEFAULT (datetime('now'))
   );
   ```
2. **Scoring function** in `relay_engine.py` — async, calls a configurable judge model (see Task 002), returns 4 floats 0.0–1.0. Prompt: "Score this AI-to-AI conversation turn on: creativity (novel ideas/wordplay), coherence (logical flow), engagement (would a reader find this interesting?), novelty (did it introduce something new?). Return JSON only."
3. **Fire-and-forget** in relay loop — after emitting `relay.turn`, schedule `asyncio.create_task(score_turn(turn_id, content))` 
4. **SSE event** — emit `relay.score` with `{turn_id, creativity, coherence, engagement, novelty}` once scoring completes
5. **API endpoint** — add `GET /experiments/{id}/scores` to `routers/experiments.py`

### Frontend

6. **Types** — add `TurnScore` type and `relay.score` SSE event to `api/types.ts`
7. **useExperimentState hook** — handle `relay.score` events, merge into turn state by `turn_id`
8. **TurnBubble.tsx** — render score badge (4 colored dots + values) when score present. Use neural-card style.
9. **RoundScoreChart.tsx** — new D3 line chart component in `components/analytics/`. 4 series (amber/cyan/green/purple). X-axis = round number, Y-axis = 0–1.
10. **Analytics.tsx** — add `RoundScoreChart` below existing charts

---

## Files to Modify

| File | Change |
|------|--------|
| `server/db.py` | Add `turn_scores` table, `insert_turn_score()`, `get_turn_scores()` |
| `server/relay_engine.py` | Add `score_turn()` async fn, fire-and-forget after each turn |
| `server/routers/experiments.py` | Add `GET /experiments/{id}/scores` endpoint |
| `ui/src/api/types.ts` | Add `TurnScore`, `ScoreEvent` types |
| `ui/src/api/hooks.ts` | Handle `relay.score` events in `useExperimentState` |
| `ui/src/components/theater/TurnBubble.tsx` | Add score badge rendering |
| `ui/src/components/analytics/RoundScoreChart.tsx` | New component |
| `ui/src/pages/Analytics.tsx` | Import + render `RoundScoreChart` |

---

## Risks / Watch-outs

- **Latency:** Scoring adds an extra LLM call per turn. Use a fast/cheap model (Gemini Flash, Haiku). Default off, opt-in via Configure page.
- **Judge model dependency:** Scoring requires a working judge model API key. Graceful degradation — if scoring fails, turns still complete.
- **D3 CSS selector safety:** Model-derived class names must use the existing sanitization pattern: `label.replace(/[^a-zA-Z0-9_-]/g, '_')`
- **Rounds cap:** Already enforced at 15 rounds — scoring stays within that budget.

---

## Related Tasks

- **002-judge-model-config.md** — scoring uses the judge model; implement together or after
- **003-per-participant-temperature.md** — independent, can run in parallel
