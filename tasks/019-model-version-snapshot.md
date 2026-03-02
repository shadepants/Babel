---
Title: Model Version Snapshot
Type: Tech Spec
Version: 1.0
Status: Draft
Owner: Jordan
Created: 2026-03-01
Depends on: none
Unlocks: 016-emergent-pattern-detector, 013-parameter-sensitivity-heatmap
---

# 019 — Model Version Snapshot

## Problem

LLM providers silently update models in place. `gemini/gemini-2.5-flash` in January is not
the same model as `gemini/gemini-2.5-flash` in March. Babel stores only the litellm string,
not the actual deployed version. This means:

1. Longitudinal comparisons are confounded — apparent behavioral changes may be provider
   updates, not experiment differences.
2. The pattern detector (spec 016) cannot distinguish "GPT-4.1 always wins" from
   "GPT-4.1 in its March 2026 checkpoint always wins."
3. Experiment reproducibility claims are false — the same config does not guarantee the
   same model.

This spec adds the most specific version identifier available at launch time and stores it
alongside each experiment. The implementation is intentionally lightweight: no blocking API
calls, no failed-launch risk, best-effort resolution only.

## Goal

At experiment launch, resolve and store the most specific available version identifier for
each model. Display versions in Theater and Gallery so users understand exactly what ran.
Enable version-aware filtering in future analytics.

## Success Criteria

- [ ] Every new experiment has `model_a_version` and `model_b_version` populated (never null
      for new experiments)
- [ ] Version strings are resolved synchronously at launch with < 50ms overhead (no blocking
      network call in the happy path)
- [ ] Theater metadata shows model version in a tooltip on the model name chip
- [ ] Gallery card tooltip shows version on hover
- [ ] Version resolution never causes an experiment launch to fail — errors fall back to a
      safe default string
- [ ] Old experiments (before this feature) show `model_version = null` without error

---

## Version Resolution Strategy

### The core insight

Providers use three distinct versioning patterns:

| Pattern | Example | Resolution |
|---------|---------|------------|
| **Date-stamped string** | `anthropic/claude-haiku-4-5-20251001` | Parse date from string — it IS the version |
| **Alias string** | `gemini/gemini-2.5-flash`, `mistral/mistral-large-latest` | Store model string + ISO date of launch |
| **Semver or opaque** | `openai/gpt-4.1` | Store model string + ISO date of launch |

For date-stamped strings, the string itself is a stable version identifier — Anthropic
guarantees that `claude-haiku-4-5-20251001` always resolves to the same checkpoint.
For all other strings, the best available record is "this model string was called on this date
with this version of litellm."

This is not perfect — it cannot detect a silent provider update within a single day — but it
is a strict improvement over storing nothing. It provides:
- Correct versioning for ~30% of model calls (Anthropic, some OpenAI)
- Auditable records for the remaining 70% (date + litellm version narrows the window of uncertainty)

### `resolve_model_version(model_string: str) -> str`

New function in `server/config.py`:

```python
import re
import datetime

_DATE_PATTERN = re.compile(r'\b(\d{8})\b')  # matches YYYYMMDD in model strings

def resolve_model_version(model_string: str) -> str:
    """Return the most specific version identifier available for this model.

    For date-stamped model strings (Anthropic), the date suffix IS the version.
    For all other models, return model_string@YYYY-MM-DD as a launch-date proxy.
    Never raises -- returns a fallback string on any error.
    """
    try:
        if m := _DATE_PATTERN.search(model_string):
            date_str = m.group(1)                 # e.g. "20251001"
            formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            return f"{model_string}@{formatted}"  # e.g. "anthropic/claude-haiku-4-5-20251001@2025-10-01"
        today = datetime.date.today().isoformat()
        return f"{model_string}@{today}"          # e.g. "gemini/gemini-2.5-flash@2026-03-01"
    except Exception:
        return model_string                       # absolute fallback: never lose the launch
```

**Why no litellm version in the string?** litellm version changes do not necessarily
correlate with model behavior changes — the provider controls the checkpoint. Adding litellm
version would create false precision. Launch date is the cleaner proxy.

**Why not call the provider's API?** Every provider's model-listing API has different auth,
rate limits, and response shapes. A blocking API call at launch time adds latency and a
failure mode. This spec defers provider API calls to a future enhancement.

---

## Backend Changes

### `server/db.py`

**New migration columns on `experiments`:**
```python
for col, ddl in [
    ("model_a_version", "TEXT"),
    ("model_b_version", "TEXT"),
]:
```
(Idempotent `try/except OperationalError` pattern, matching existing migration code.)

**Updated `create_experiment` signature:**
```python
async def create_experiment(
    self,
    ...
    model_a_version: str | None = None,   # new
    model_b_version: str | None = None,   # new
) -> str:
```

Insert values included in the `INSERT INTO experiments` statement.

**`get_agents_for_experiment`:** No change. Version is stored on the experiment row, not in
`agents_config_json`. For N-way experiments (3-4 agents), the version of agent 0 maps to
`model_a_version`, agent 1 to `model_b_version`. Agents 2+ are not versioned in v1.

### `server/config.py`

Add `resolve_model_version(model_string: str) -> str` as described above. No imports beyond
`re` and `datetime` — no new dependencies.

### `server/routers/relay.py`

**In `_start_standard_relay`**, before calling `db.create_experiment`:

```python
from server.config import resolve_model_version

model_a_version = resolve_model_version(body.model_a)
model_b_version = resolve_model_version(body.model_b)
```

Pass both to `db.create_experiment(... model_a_version=model_a_version, model_b_version=model_b_version)`.

**In `_start_rpg_relay`**, derive versions from the first two participants:
```python
p0_model = body.participants[0].get("model", "")
p1_model = body.participants[1].get("model", "") if len(body.participants) > 1 else ""
model_a_version = resolve_model_version(p0_model)
model_b_version = resolve_model_version(p1_model)
```

**Version resolution MUST NOT block or raise.** Wrap any call site in `try/except` as a
belt-and-suspenders guard, even though `resolve_model_version` itself never raises.

---

## Frontend Changes

### `ui/src/api/types.ts`

Add to `Experiment` type:
```ts
model_a_version: string | null;
model_b_version: string | null;
```

### `ui/src/pages/Theater.tsx` and related Theater components

Model name chips (the colored badges showing "Claude Haiku 4.5 / Gemini Flash") MUST show
the version string in a `title` tooltip when `model_a_version` / `model_b_version` is set.

Example tooltip: `gemini/gemini-2.5-flash@2026-03-01`

The chip label itself does NOT change — it still shows the display name. The version is
supplementary information.

### `ui/src/pages/Gallery.tsx`

Gallery cards show model names. Add the version string to the `title` attribute on the
model name spans. No visual change — tooltip only.

### `ui/src/pages/Analytics.tsx`

Version-aware grouping: when comparing model performance across experiments, the Analytics
page SHOULD group by `model_a_version` rather than `model_a` when computing win rates or
score averages. This prevents mixing Gemini Flash runs from January with March runs in the
same bucket.

Add a "Group by version" toggle (default: off — groups by model string for backward
compatibility; on — groups by resolved version string).

---

## Display Format

Version strings follow one of two shapes:

| Model type | Stored as | Displayed as |
|-----------|-----------|-------------|
| Date-stamped | `anthropic/claude-haiku-4-5-20251001@2025-10-01` | `claude-haiku-4-5 · v2025-10-01` |
| Alias | `gemini/gemini-2.5-flash@2026-03-01` | `gemini-2.5-flash · launched 2026-03-01` |

The frontend SHOULD parse and format the version string for display. A helper function
`formatModelVersion(versionString: string): string` in `ui/src/lib/models.ts` (create if
not exists) handles the parsing. If parsing fails, display the raw version string.

---

## Migration for Existing Experiments

Old experiments have `model_a_version = null` and `model_b_version = null`. This is correct
and expected. The frontend MUST handle null gracefully: no tooltip, no error. No backfill of
historical versions is attempted — the launch date is not recoverable for past experiments.

Future consideration: a one-time migration script could apply `resolve_model_version` to
existing model strings as a best-effort backfill (using today's date as the launch date
approximation). This is out of scope for v1 because it would produce misleading dates.

---

## Edge Cases and Failure Modes

| Scenario | Behavior |
|----------|----------|
| `resolve_model_version` raises unexpectedly | Outer `try/except` returns `model_string` as fallback; experiment launches normally |
| Model string is empty or None | Stored as empty string version; no tooltip shown |
| N-way experiment with 4 agents | Agents 0→`model_a_version`, 1→`model_b_version`. Agents 2+ have no version stored in v1. |
| Provider silently updates the model mid-day | Version string shows launch date; two experiments on the same day may have used different checkpoints. This is documented as a known limitation. |
| Two experiments with identical model strings on same day | Same version string. Indistinguishable. Acceptable — same-day same-model comparison is not the primary use case. |
| Version string is very long in Gallery tooltip | Truncate at 60 characters with `…` in display |

---

## Out of Scope (v1)

- Provider API calls to resolve actual checkpoint hashes
- Versioning for agents 2+ in N-way experiments
- Automatic experiment invalidation when a model is known to have been updated
- Changelog feed of provider model updates (e.g., "Gemini Flash was updated on 2026-02-15")
- Backfill of version data for historical experiments

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `server/config.py` | Modify | Add `resolve_model_version()` function |
| `server/db.py` | Modify | Two new columns, updated `create_experiment` signature |
| `server/routers/relay.py` | Modify | Resolve + pass versions in both relay helpers |
| `ui/src/api/types.ts` | Modify | Two new nullable fields on `Experiment` |
| `ui/src/pages/Theater.tsx` | Modify | Version tooltip on model chips |
| `ui/src/pages/Gallery.tsx` | Modify | Version tooltip on model name spans |
| `ui/src/pages/Analytics.tsx` | Modify | "Group by version" toggle |
| `ui/src/lib/models.ts` | Create or modify | `formatModelVersion()` helper |

---

## Acceptance Criteria

- [ ] `resolve_model_version("anthropic/claude-haiku-4-5-20251001")` returns
      `"anthropic/claude-haiku-4-5-20251001@2025-10-01"` (date extracted from string)
- [ ] `resolve_model_version("gemini/gemini-2.5-flash")` returns
      `"gemini/gemini-2.5-flash@<today>"` (launch-date proxy)
- [ ] New experiments have non-null `model_a_version` and `model_b_version` in DB
- [ ] Old experiments have null versions and render without error in all UI surfaces
- [ ] Theater model chip shows version in tooltip on hover
- [ ] Gallery card shows version in tooltip on hover
- [ ] A launch failure cannot be caused by version resolution logic (tested by mocking
      `resolve_model_version` to throw and verifying experiment still launches)
- [ ] Analytics "Group by version" toggle correctly separates runs from different dates
