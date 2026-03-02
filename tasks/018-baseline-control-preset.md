---
Title: Baseline Control Preset
Type: Tech Spec
Version: 1.0
Status: Draft
Owner: Jordan
Created: 2026-03-01
Depends on: none
Unlocks: 013-parameter-sensitivity-heatmap, 016-emergent-pattern-detector, 005-hypothesis-testing
---

# 018 — Baseline Control Preset

## Problem

Every experimental finding in Babel is relative to nothing. "The conlang preset produces 12
vocabulary words" — is that a lot? Compared to what? Without a null hypothesis (a control
condition that deliberately removes the thing being tested), you cannot measure what any
preset, model choice, or feature flag actually *changes*. You are measuring the wrong thing:
absolute output rather than treatment effect.

A baseline is the single cheapest change that converts Babel from an observation tool into
an experiment platform. It requires one new YAML file, one new UI button, and one column.

## Goal

Add a "Baseline" preset that acts as an unstructured control condition. Any experiment using
a non-baseline preset can be paired with a baseline run using the same models, rounds, and
temperature. The comparison produces the first meaningful delta metric in Babel: how much does
this preset actually change what happens between these two models?

## Success Criteria

- [ ] `baseline` preset appears in the preset selector in Configure, clearly marked "(Control)"
- [ ] "Run Baseline Comparison" button on completed Theater pages launches a baseline
      experiment with matching models, rounds, and temperatures in ≤ 2 clicks
- [ ] `baseline_experiment_id` is stored on the source experiment when a baseline comparison
      is launched from Theater
- [ ] Theater shows a "vs Baseline" delta panel when a linked baseline experiment exists and
      is completed — displaying at minimum: vocab delta, score delta, and rounds-completed parity
- [ ] Baseline experiments are visually distinct in Gallery (control badge) to avoid confusion
      with real experiments

---

## The Baseline Preset

### `server/presets/baseline.yaml` (new file)

```yaml
id: baseline
name: Baseline
emoji: "\U0001F3AF"
description: "Control condition. Unstructured conversation with no task, creative constraint,
  or vocabulary goal. Pair with any other preset to measure its true effect."
seed: |
  Hello. Let's just have a conversation -- no particular task or goal in mind. What's on
  your mind? Feel free to take this wherever you like.
system_prompt: |
  Have a natural, open-ended conversation with another AI model. There is no task, no
  format requirement, and no creative constraint. Just talk. Be yourself.
defaults:
  rounds: 4
  temperature: 0.7
  max_tokens: 1000
suggested_models:
  a: "Claude Haiku 4.5"
  b: "GPT-4.1 Mini"
tags: [baseline, control, unstructured]
is_control: true
```

**Rationale for the seed:** Deliberately minimal. No language-building, no debate topic, no
cipher, no story prompt. The absence of constraint IS the control condition. The seed MUST NOT
suggest any topic that might bias toward vocabulary creation, argumentation, or narrative.

**Rationale for defaults:** 4 rounds and low token budget — baseline comparisons should be
cheap. Users should run many of them without hesitation.

---

## Backend Changes

### `server/db.py`

**New migration column on `experiments`:**
```python
("baseline_experiment_id", "TEXT"),  -- ID of the baseline comparison run, if one exists
```

**New helper:**
```python
async def link_baseline(self, source_experiment_id: str, baseline_experiment_id: str) -> None:
    """Set the baseline_experiment_id on the source experiment."""
    await self._execute_queued(
        "UPDATE experiments SET baseline_experiment_id = ? WHERE id = ?",
        (baseline_experiment_id, source_experiment_id),
    )
```

**Updated `get_experiment`:** MUST return `baseline_experiment_id` in the row dict.
No schema change needed — it will be included automatically once the column exists.

### `server/routers/relay.py`

**New field on `RelayStartRequest`:**
```python
baseline_for_experiment_id: str | None = Field(
    default=None,
    description="If set, this experiment is a baseline comparison for the given experiment ID."
)
```

**In `start_relay`:** After creating the experiment and launching the relay, if
`body.baseline_for_experiment_id` is set:
1. Verify the source experiment exists (raise HTTP 404 if not).
2. Call `await db.link_baseline(body.baseline_for_experiment_id, match_id)`.

### `server/routers/experiments.py`

**New endpoint: `GET /api/experiments/:id/baseline`**

Returns the baseline comparison experiment (full experiment object) if
`baseline_experiment_id` is set and the baseline experiment exists. Returns HTTP 404 if no
baseline is linked. Returns HTTP 202 with `{"status": "running"}` if baseline exists but
is not yet completed.

---

## Frontend Changes

### `ui/src/api/types.ts`

Add `is_control: boolean` to `Preset` type.
Add `baseline_experiment_id: string | null` to `Experiment` type.

### `ui/src/pages/Configure.tsx`

- Baseline preset MUST appear in the preset grid with a distinct "(Control)" label and
  muted styling (e.g., `opacity-70`, dashed border) to visually separate it from
  experimental presets.
- The preset selector's description for `baseline` MUST include the line:
  "Use this to measure the effect of other presets — not as an experiment on its own."

### `ui/src/pages/Theater.tsx`

**"Run Baseline Comparison" button:**
- MUST appear only on completed, non-baseline experiments.
- MUST NOT appear if `baseline_experiment_id` is already set (baseline already exists).
- On click: POST to `/api/relay/start` with:
  - `preset: "baseline"`
  - `seed` and `system_prompt` from the baseline preset (fetched from `/api/presets`)
  - `model_a` and `model_b` from the source experiment
  - `temperature_a` and `temperature_b` from the source experiment's `config_json`
  - `rounds`: same as source experiment's `rounds_planned`
  - `baseline_for_experiment_id`: source experiment's `id`
  - All feature flags (`enable_scoring`, etc.) mirrored from source experiment
- On success: show a toast "Baseline running — check back soon" and set a local pending
  state (the Theater component polls `/api/experiments/:id/baseline` every 15 seconds
  until the baseline is complete, then renders the delta panel).

**Baseline delta panel:**
Rendered below the transcript when `baseline_experiment_id` is set and baseline is
`status = "completed"`. Shows:

```
┌─────────────────────────────────────────────┐
│  vs Baseline                                │
│  Vocab coined:  +10 words  (12 vs 2)        │
│  Avg score A:   +0.8       (7.2 vs 6.4)     │
│  Avg score B:   +1.1       (6.8 vs 5.7)     │
│  Rounds parity: ✓ (both ran 4/4)            │
└─────────────────────────────────────────────┘
```

Delta values MUST be signed (+ or –). If scoring was not enabled on the source experiment,
score delta rows are omitted. If baseline failed, show: "Baseline run failed — re-run from
Theater."

### `ui/src/pages/Gallery.tsx`

Baseline experiments MUST render with a `CONTROL` badge (amber, not the normal model-color
header) to make them visually distinct. They SHOULD be filterable (add "Show controls" toggle,
default off — baselines clutter the gallery if shown by default).

---

## Preset Loader Changes

`server/presets/` is loaded by the preset-loading logic (likely scanned directory). The new
`baseline.yaml` file MUST be picked up automatically. Verify the `is_control: true` field
is passed through to the frontend response as part of the `/api/presets` payload.

If the preset loader does not pass through unknown YAML keys, add `is_control` to the
`PresetResponse` schema explicitly.

---

## Delta Computation

Delta panel values are computed **client-side** from two fetched experiment objects.

| Metric | Formula | Data source |
|--------|---------|-------------|
| Vocab delta | `source.vocab_count - baseline.vocab_count` | `/vocabulary` endpoint |
| Score delta (per agent) | `source.avg_score - baseline.avg_score` | `/scores` endpoint |
| Rounds parity | `source.rounds_completed == baseline.rounds_completed` | experiment object |

All deltas SHOULD use the same judge model across source and baseline for score comparability.
If judge models differ (e.g., user changed JUDGE_MODEL between runs), a warning MUST be shown:
"⚠ Judge model differs — score delta may not be comparable."

---

## Edge Cases and Failure Modes

| Scenario | Behavior |
|----------|----------|
| Baseline launched for a baseline experiment | Button does not appear (no recursive control conditions) |
| Source experiment used a custom system prompt | Baseline uses its own system prompt (unstructured), not the source's. This is correct — the baseline must be truly unstructured. |
| Baseline run fails | Delta panel shows "Baseline failed" with a re-run button. Link in DB is cleared by user via a "Remove baseline" action (or just re-run, which overwrites `baseline_experiment_id`). |
| Source experiment is still running | "Run Baseline Comparison" button is not shown for running experiments. |
| User runs baseline manually from Configure | Works. But `baseline_for_experiment_id` is null — no automatic link is created. Baseline appears in Gallery as a standalone control, not linked to anything. |
| Model versions differ between source and baseline | Acceptable in v1. Note it in the delta panel. Model versioning is addressed in spec 019. |
| Baseline is running (status = "running") | Delta panel shows "Baseline running… check back soon" with a spinner. Theater polls every 15s. |

---

## Out of Scope (v1)

- Automatic baseline launching on every experiment (would double costs)
- Multi-baseline comparison (comparing source against N different control conditions)
- Preset-specific baselines (e.g., a "conlang baseline" that uses the conlang system prompt
  but has no seed vocabulary — interesting but requires more design)
- Statistical significance testing on the delta (requires replication groups — see spec 017)

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `server/presets/baseline.yaml` | Create | The control preset |
| `server/db.py` | Modify | `baseline_experiment_id` column, `link_baseline` helper |
| `server/routers/relay.py` | Modify | `baseline_for_experiment_id` field, link call |
| `server/routers/experiments.py` | Modify | `GET /experiments/:id/baseline` endpoint |
| `ui/src/api/types.ts` | Modify | `is_control` on Preset, `baseline_experiment_id` on Experiment |
| `ui/src/pages/Configure.tsx` | Modify | Baseline preset styling |
| `ui/src/pages/Theater.tsx` | Modify | Run Baseline button, delta panel, polling |
| `ui/src/pages/Gallery.tsx` | Modify | CONTROL badge, filter toggle |

---

## Acceptance Criteria

- [ ] `baseline` preset appears in Configure preset selector with "(Control)" label
- [ ] "Run Baseline Comparison" button appears on completed, non-baseline Theater pages
- [ ] Clicking button launches a baseline experiment and sets `baseline_experiment_id` on source
- [ ] Delta panel renders correctly when baseline is completed: correct signed vocab and score deltas
- [ ] Delta panel shows "Baseline running..." when baseline status is not yet completed
- [ ] Warning shown when judge models differ between source and baseline
- [ ] Gallery: baseline experiments show CONTROL badge; hidden by default behind filter toggle
- [ ] Button does not appear on baseline experiments themselves (no recursive baselines)
- [ ] `/api/experiments/:id/baseline` returns 404 when no baseline is linked
