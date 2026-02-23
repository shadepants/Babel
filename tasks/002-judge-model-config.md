# Task 002 — Configurable Judge / Referee Model

**Status:** [x] Done — 2026-02-23  
**Priority:** High  
**Source:** CLAUDE INSIGHT RESEARCH — C-005 (karpathy/llm-council), C-009 (promptheone.com), report insights-2026-02-22-1.md  
**Added:** 2026-02-22

---

## Problem

Babel's relay loop uses participant models for conversation but has no dedicated evaluator. Promptheone.com uses a separate judge model isolated from the conversation. karpathy/llm-council implements a "chairman" model that synthesizes council responses. Today, if we add scoring (Task 001) or want to declare a winner in Arena mode, the same model that competes also evaluates — introducing self-serving bias.

## Goal

Add a configurable judge model to Babel. The judge:
1. Is separate from participant models
2. Scores turns (feeds Task 001)  
3. Can declare a winner at experiment end (optional)
4. Is configurable per-experiment in Configure page

## Acceptance Criteria

- [ ] `config.py` has a `JUDGE_MODEL` setting (default: `gemini/gemini-2.0-flash`)
- [ ] Configure page exposes a "Judge Model" dropdown (same model registry, labeled separately)
- [ ] Scoring function (Task 001) uses the judge model, not participant models
- [ ] Optional "Final Verdict" call at experiment end: judge reads full transcript, returns winner + reasoning
- [ ] Judge model is stored in experiment metadata and shown in Analytics/Gallery

---

## Current State

**Model registry:** `server/config.py` — `MODEL_REGISTRY` dict, `ALLOWED_MODELS` set  
**Experiment config:** `POST /relay/start` accepts `{model_a, model_b, preset_id, num_rounds, seed_words, system_prompt, turn_delay_seconds}`  
**Configure page:** `ui/src/pages/Configure.tsx` — 2 model dropdowns, sliders, seed input  
**DB experiments table:** `id, preset_id, model_a, model_b, status, num_rounds, seed_words, system_prompt, created_at, completed_at, total_turns, total_tokens, vocab_count`

## Desired State

- `judge_model` column added to `experiments` table
- `POST /relay/start` accepts optional `judge_model` param (defaults to `config.JUDGE_MODEL`)
- Configure page has "Referee Model" section with model dropdown + "none" option
- `relay_engine.py` uses judge model for scoring, not a participant model
- Final verdict: opt-in toggle in Configure, fires at experiment end, emits `relay.verdict` SSE event

---

## Implementation Steps

### Backend

1. **`config.py`** — add `JUDGE_MODEL: str = "gemini/gemini-2.0-flash"` default
2. **DB migration** — add `judge_model TEXT` column to `experiments` table in `db.py`
3. **`relay_engine.py`** — `score_turn()` accepts `judge_model` param, uses it for the scoring call
4. **`relay_engine.py`** — add `final_verdict()` async fn: feeds full transcript to judge, returns `{winner, reasoning}`; emits `relay.verdict` SSE event
5. **Relay router** (`routers/relay.py`) — accept `judge_model` in request body, pass to engine, store in DB
6. **Experiments router** — include `judge_model` in experiment detail response

### Frontend

7. **`api/types.ts`** — add `judge_model` to `ExperimentConfig` and `Experiment` types; add `VerdictEvent` SSE type
8. **Configure.tsx** — add "Referee" section: model dropdown (same `ALLOWED_MODELS` list + "None" option), verdict toggle
9. **Theater.tsx** — handle `relay.verdict` event, render final verdict card at bottom of conversation
10. **Gallery.tsx** — show judge model badge on experiment cards (subtle, monospace label)
11. **Analytics.tsx** — show judge model + verdict (if present) in experiment metadata row

---

## Files to Modify

| File | Change |
|------|--------|
| `server/config.py` | Add `JUDGE_MODEL` constant |
| `server/db.py` | Add `judge_model` column, update insert/select queries |
| `server/relay_engine.py` | `score_turn(judge_model)`, `final_verdict(judge_model)` |
| `server/routers/relay.py` | Accept + pass `judge_model` param |
| `server/routers/experiments.py` | Include `judge_model` in responses |
| `ui/src/api/types.ts` | `ExperimentConfig.judge_model`, `VerdictEvent` |
| `ui/src/pages/Configure.tsx` | Referee section + verdict toggle |
| `ui/src/pages/Theater.tsx` | Render final verdict card |
| `ui/src/pages/Gallery.tsx` | Judge model badge |
| `ui/src/pages/Analytics.tsx` | Metadata row update |

---

## Risks / Watch-outs

- **Cost:** Final verdict = 1 extra LLM call with full transcript context (can be long). Only trigger if opted in.
- **Model availability:** Judge model needs its own API key. If judge model key is missing, fall back gracefully (log warning, skip scoring).
- **Bias:** Even a "neutral" judge model has its own training biases. Document this as a known limitation.
- **"None" judge:** If judge_model = null, scoring and verdicts are disabled. Tournament mode should warn if no judge is configured.

---

## Related Tasks

- **001-round-scoring.md** — scoring uses the judge model; implement before or alongside
- **003-per-participant-temperature.md** — independent
