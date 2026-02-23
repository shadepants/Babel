# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23
**Active Agent:** Claude Code
**Current Goal:** Closed out Tasks 001+002; all tracked tasks complete

## Changes This Session

### Task 001: Round-by-Round Scoring
- [x] **server/db.py** -- `turn_scores` table; `insert_turn_score()`, `get_turn_scores()` methods
- [x] **server/relay_engine.py** -- `score_turn()` async fn; `final_verdict()` async fn; `relay.score` + `relay.verdict` SSE event types
- [x] **server/routers/experiments.py** -- `GET /experiments/{id}/scores` endpoint
- [x] **ui/src/api/types.ts** -- `TurnScore`, `ScoreEvent`, `VerdictEvent` types
- [x] **ui/src/api/hooks.ts** -- `scores: Record<number, ScoreEvent>` + `verdict: VerdictEvent | null` in experiment state; handles `relay.score` + `relay.verdict` SSE events
- [x] **ui/src/components/theater/TurnBubble.tsx** -- score badge (4 ScorePill items: creativity/coherence/engagement/novelty)
- [x] **ui/src/components/theater/ConversationColumn.tsx** -- passes `score={scores[turn.turn_id]}` to each TurnBubble
- [x] **ui/src/components/analytics/RoundScoreChart.tsx** -- NEW: D3 line chart, 4 series (amber/cyan/emerald/purple)
- [x] **ui/src/pages/Analytics.tsx** -- `RoundScoreChart` rendered when `enable_scoring` is true; scores fetched via `api.getExperimentScores()`
- [x] **ui/src/pages/Theater.tsx** -- final verdict card rendered at bottom when experiment completes

### Task 002: Configurable Judge Model
- [x] **server/config.py** -- `JUDGE_MODEL = "gemini/gemini-2.5-flash"` default
- [x] **server/db.py** -- idempotent `ALTER TABLE` migration for `judge_model TEXT` column; stored in experiments
- [x] **server/relay_engine.py** -- `score_turn(judge_model)` + `final_verdict(judge_model)` use the configured judge
- [x] **server/routers/relay.py** -- `RelayStartRequest` accepts `judge_model`, `enable_scoring`, `enable_verdict` params
- [x] **ui/src/pages/Configure.tsx** -- Referee section: judge model dropdown + Enable Scoring toggle + Enable Verdict toggle
- [x] **ui/src/pages/Gallery.tsx** -- `// judged` badge on experiments that have a judge model
- [x] **ui/src/pages/Analytics.tsx** -- Referee stat card showing judge model name

### Bonus Work
- [x] **ui/src/components/analytics/TokenChart.tsx** -- NEW: D3 grouped bar chart (tokens per round per model)
- [x] **ui/src/pages/Tournaments.tsx** -- NEW: tournament history list at `/tournaments`
- [x] **ui/src/pages/Arena.tsx** -- "Past Tournaments ->" link to /tournaments
- [x] **ui/src/pages/Settings.tsx** -- In-app API key config (set/change per provider) + cost tier labels
- [x] **tasks/001-round-scoring.md** -- Status updated to Done
- [x] **tasks/002-judge-model-config.md** -- Status updated to Done

### Commit
- [x] Committed as `df35ad0` -- "feat(scoring): judge model, per-turn scoring, verdict + analytics charts"

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript compile | PASSED | Exit 0, zero errors |
| Staging | VERIFIED | 27 files, 1599 insertions |
| Commit | VERIFIED | df35ad0 on fix/gemini-audit-hardening |
| Task files | UPDATED | 001 + 002 marked [x] Done |
| CONTEXT.md | UPDATED | Settings polish checked; new components in arch table |

## Remaining Tasks (Next Up)

1. [ ] **Task 004** -- Model memory spike: evaluate Backboard.io (2-4h research) OR go straight to DIY SQLite approach (~4-6h coding)
   - DIY spec is in `tasks/004-backboard-memory-spike.md` (Alternative section)
   - Files: `server/db.py` (model_memory table), `server/relay_engine.py` (inject memory into system prompt), `ui/src/pages/Configure.tsx` (enable memory toggle)
2. [ ] **Browser SSE smoke test** -- Open Theater page, Network tab, confirm `id: 1`, `id: 2` per event frame; then test Last-Event-ID reconnect replay (no code needed)
3. [ ] **Side-by-side comparison** (Phase 6b) -- Compare two experiments head-to-head; 8-12h, deferred
4. [ ] **Merge fix/gemini-audit-hardening -> master** -- Branch has accumulated all phases 7-9 + tasks 001-003 + 005

## Architecture Notes for Next Agent
- **Judge scoring:** `turn_scores` table has `(turn_id, creativity, coherence, engagement, novelty, scored_at)`. Keyed by `turn_id` (integer PK of turns table). `experiment.enable_scoring` guards chart render. Old experiments without scoring return empty scores array -- handled gracefully.
- **Verdict:** `relay.verdict` SSE event carries `{winner: "model_a"|"model_b"|"tie", reasoning: string}`. Theater page stores it in `experiment.verdict` state and renders at bottom.
- **TokenChart:** Renders in Analytics below LatencyChart when turn stats are available. Shows tokens per turn per model as grouped bars.
- **Tournaments page:** At `/tournaments`, linked from Arena. Simple list, no SSE -- static fetch of `GET /api/tournaments`.
