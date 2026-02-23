# Task 003 — Per-Participant Temperature Control

**Status:** [ ] Not Started  
**Priority:** Medium  
**Source:** CLAUDE INSIGHT RESEARCH — C-009 (promptheone.com), report insights-2026-02-22-1.md  
**Added:** 2026-02-22

---

## Problem

Today all models in a Babel experiment use litellm's default temperature (typically 1.0). Promptheone.com gives each participant its own temperature setting. Temperature is one of the most impactful levers for AI conversation character: high temp = creative/chaotic, low temp = methodical/predictable. Being unable to set per-participant temperature means we can't explore asymmetric conversations (e.g., "what happens when a creative model meets a precise one?").

## Goal

Allow each participant model in an experiment to have its own temperature setting. Configurable via Configure page sliders. Stored in experiment metadata and used in relay calls.

## Acceptance Criteria

- [ ] `POST /relay/start` accepts `temperature_a` and `temperature_b` (floats, 0.0–2.0, default 1.0)
- [ ] Relay engine passes the per-model temperature to each litellm call
- [ ] Configure page shows two temperature sliders — one per model slot, labeled with model name
- [ ] Temperature values stored in `experiments` table and surfaced in Analytics metadata
- [ ] Tournament mode assigns equal temperatures to all models (same value), or supports per-model in future

---

## Current State

**Relay engine:** `server/relay_engine.py` — `call_model()` builds litellm params; temperature likely not set (uses litellm default)  
**Relay request schema:** `{model_a, model_b, preset_id, num_rounds, seed_words, system_prompt, turn_delay_seconds}`  
**Configure page:** 2 model dropdowns + sliders for `num_rounds` and `turn_delay_seconds`  
**DB:** No temperature columns in `experiments` table

## Desired State

- `experiments` table: add `temperature_a REAL DEFAULT 1.0`, `temperature_b REAL DEFAULT 1.0`
- `call_model()` accepts `temperature` param and passes it to litellm
- Configure page: 2 temperature sliders (range 0.0–2.0, step 0.1, default 1.0), positioned under each model dropdown
- Analytics: show temperature_a / temperature_b in experiment metadata row

---

## Implementation Steps

### Backend

1. **DB migration** — add `temperature_a REAL DEFAULT 1.0`, `temperature_b REAL DEFAULT 1.0` columns to `experiments` table in `db.py`
2. **`relay_engine.py`** — update `call_model(model, messages, temperature=1.0)` signature; pass `temperature=temperature` to litellm call
3. **Relay engine loop** — track which participant is A vs B, pass correct temperature when calling each model
4. **`routers/relay.py`** — add `temperature_a: float = 1.0` and `temperature_b: float = 1.0` to request body schema; validate range 0.0–2.0; pass to engine + store in DB
5. **`routers/experiments.py`** — include `temperature_a`, `temperature_b` in experiment detail responses

### Frontend

6. **`api/types.ts`** — add `temperature_a`, `temperature_b` to `ExperimentConfig` and `Experiment` types
7. **Configure.tsx** — add two temperature sliders (Shadcn Slider component), one under each model dropdown
   - Label: `// TEMPERATURE` in neural-section-label style
   - Range: 0.0–2.0, step 0.1
   - Display current value as monospace badge next to label
8. **Analytics.tsx** — add temperature_a / temperature_b to metadata stats row

---

## Files to Modify

| File | Change |
|------|--------|
| `server/db.py` | Add temperature columns, update insert/select queries |
| `server/relay_engine.py` | `call_model(temperature)` param, per-model temperature in loop |
| `server/routers/relay.py` | Accept `temperature_a`, `temperature_b` in request |
| `server/routers/experiments.py` | Include temperatures in responses |
| `ui/src/api/types.ts` | Add temperature fields to types |
| `ui/src/pages/Configure.tsx` | Two temperature sliders |
| `ui/src/pages/Analytics.tsx` | Show temperatures in metadata |

---

## Risks / Watch-outs

- **litellm temperature support:** Most providers support temperature 0.0–1.0; some (OpenAI, Anthropic) support up to 2.0. Cap at 1.0 for safety, or validate per-provider. Check litellm docs.
- **Deterministic mode:** temperature=0.0 makes model nearly deterministic — useful for testing but produces boring conversations. Consider a minimum of 0.1 in UI.
- **Tournament fairness:** In Arena/Tournament mode, all models should use the same temperature for fair comparison. Enforce this server-side: if `tournament_mode=True`, ignore per-model temperatures and use a single `temperature` param.

---

## Related Tasks

- **001-round-scoring.md** — independent, can run in parallel
- **002-judge-model-config.md** — independent, can run in parallel
