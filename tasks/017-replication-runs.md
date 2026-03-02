---
Title: Replication Runs
Type: Tech Spec
Version: 1.0
Status: Draft
Owner: Jordan
Created: 2026-03-01
Depends on: none
Unlocks: 013-parameter-sensitivity-heatmap, 006-ab-forking-dashboard, 016-emergent-pattern-detector
---

# 017 — Replication Runs

## Problem

Every Babel experiment produces a single data point. LLMs are stochastic — the same config
run twice produces measurably different outcomes (vocab count, winner, score). Without
distributional data, every result is anecdote. Reporting "GPT-4.1 coined 12 words" is
meaningless; "GPT-4.1 coins 11.4 ± 2.1 words (n=5)" is evidence.

This is the highest-leverage missing primitive for experimental validity. Specs 013, 006, and
016 are all hollow until this exists.

## Goal

Allow a user to launch N identical experiments from a single Configure action. Group results
into a **replication group**, compute aggregate statistics, and surface them in Gallery and
Analytics as a unified scientific unit.

## Success Criteria

- [ ] User can launch 2-10 replications of any valid experiment config in one action
- [ ] Replication group statistics (vocab mean±stddev, win rate, score mean±stddev) are
      computed and available via API within 30 seconds of the last experiment completing
- [ ] Gallery renders replication groups as a single row with `n=X` badge
- [ ] Individual experiments within a group remain accessible via existing Theater URLs
- [ ] Replication count = 1 behaves identically to current single-launch behavior (no regression)

---

## Architecture

### New: `replication_groups` table

```sql
CREATE TABLE IF NOT EXISTS replication_groups (
    id            TEXT PRIMARY KEY,         -- uuid4.hex[:12]
    created_at    TEXT NOT NULL,
    config_snapshot_json TEXT NOT NULL,    -- full RelayStartRequest as JSON (immutable record)
    experiment_ids_json  TEXT NOT NULL,    -- ordered list of experiment IDs
    status        TEXT DEFAULT 'running'
        CHECK(status IN ('running', 'completed', 'partial', 'failed'))
);
```

### Migration on `experiments` table (idempotent ALTER TABLE pattern)

```python
("replication_group_id", "TEXT"),          -- FK to replication_groups.id; NULL = standalone
```

### New endpoint: `POST /api/relay/replicate`

Does NOT replace `/api/relay/start`. Accepts the same `RelayStartRequest` body plus one
additional field: `replication_count: int` (2-10). Loops relay/start N times sequentially
with a 2-second gap between launches. Returns immediately after all launches are submitted
(not after completion).

**Request body:**
```json
{
  "model_a": "anthropic/claude-haiku-4-5-20251001",
  "model_b": "gemini/gemini-2.5-flash",
  "preset": "conlang",
  "rounds": 5,
  "replication_count": 5
}
```

**Response:**
```json
{
  "group_id": "a1b2c3d4e5f6",
  "experiment_ids": ["id1", "id2", "id3", "id4", "id5"],
  "count": 5,
  "status": "running"
}
```

### New endpoint: `GET /api/replication-groups/:group_id`

Returns group metadata + per-experiment status + aggregate statistics. Statistics are
computed on-the-fly from completed experiments (not cached). Returns partial stats if some
experiments are still running.

**Response shape:**
```json
{
  "group_id": "a1b2c3d4e5f6",
  "status": "completed",
  "count": 5,
  "completed": 5,
  "running": 0,
  "failed": 0,
  "experiments": [
    {"id": "id1", "status": "completed", "rounds_completed": 5, "winner": "A"}
  ],
  "stats": {
    "vocab_count":  { "mean": 11.4, "stddev": 2.1, "min": 8, "max": 14, "values": [8,10,12,13,14] },
    "winner":       { "A": 3, "B": 1, "tie": 0, "none": 1 },
    "avg_score_a":  { "mean": 7.2,  "stddev": 0.8 },
    "avg_score_b":  { "mean": 6.8,  "stddev": 1.1 },
    "rounds_completed": { "mean": 4.8, "min": 4, "max": 5 }
  },
  "config_snapshot": { ... }
}
```

### New endpoint: `GET /api/replication-groups` (list)

Returns all replication groups for Gallery, most recent first. Accepts `limit` and `offset`.

---

## Backend Changes

### `server/db.py`

1. Add `replication_groups` table creation in `_create_tables()`.
2. Add `replication_group_id TEXT` to `experiments` migration in `_migrate()`.
3. New helpers:
   - `create_replication_group(config_snapshot, experiment_ids) -> str`
   - `get_replication_group(group_id) -> dict | None`
   - `list_replication_groups(limit, offset) -> list[dict]`
   - `get_replication_group_stats(group_id) -> dict` — queries vocabulary,
     turn_scores, and experiments tables; returns the stats shape above.
   - `update_replication_group_status(group_id)` — called after each experiment in
     the group completes; re-derives status from member statuses.

### `server/routers/relay.py`

1. Add `replication_count: int = Field(default=1, ge=1, le=10)` to `RelayStartRequest`.
2. New route handler `POST /relay/replicate`:
   - Validates body using existing `_validate_and_resolve_agents`.
   - Creates replication group record.
   - Loops `_start_standard_relay` (or `_start_rpg_relay`) N times with 2s `asyncio.sleep`
     between launches.
   - Sets `replication_group_id` on each experiment via `db.create_experiment`.
   - Returns `{group_id, experiment_ids, count, status}`.
3. Existing `/relay/start` MUST remain unchanged.

### `server/routers/replication.py` (new file)

Router for `GET /api/replication-groups` and `GET /api/replication-groups/:group_id`.
Mounted at `/api/replication-groups` in `server/app.py`.

---

## Frontend Changes

### `ui/src/api/types.ts`

Add `ReplicationGroup`, `ReplicationStats` types.

### `ui/src/pages/Configure.tsx`

- Below the "Launch" button: `Replications` number input (1-10, default 1).
- When > 1: button label changes to "Launch N replications".
- When `replication_count > 1`, POST to `/api/relay/replicate` instead of `/api/relay/start`.
- On success: navigate to `/replication/:group_id`.

### `ui/src/pages/Gallery.tsx`

- Fetch both `/api/experiments` and `/api/replication-groups`.
- Render replication groups as a distinct card type: "Replication Group" header, `n=X` badge
  in top-right corner, stats summary (vocab mean±stddev, win rate bar chart inline).
- Individual experiment cards within a group are collapsible (hidden by default).
- Standalone experiments (no group) render as today.

### `ui/src/pages/ReplicationGroup.tsx` (new page)

Route: `/replication/:groupId`

- Header: config summary (preset, models, N runs).
- Stats panel: vocab distribution (small dot-plot), winner pie, score box plots.
- Experiment table: one row per run, linking to individual Theater pages.
- Status badge: "All complete", "3/5 complete", "1 failed".

### `ui/src/App.tsx`

Add `/replication/:groupId` route.

---

## Stats Computation Detail

All stats MUST be computed only over experiments with `status = 'completed'`. Failed
experiments contribute to the `failed` count but MUST NOT skew means or stddev.

**Vocab count:** query `COUNT(*) FROM vocabulary WHERE experiment_id = ?` per experiment.

**Winner:** tally `winner` column values across the group.

**Avg score per agent:** from `turn_scores` joined to `turns`, grouped by `turns.speaker_idx`.

**Stddev formula:** population stddev `sqrt(sum((x - mean)^2) / n)`. With n < 3, report
stddev as `null` (not enough data for meaningful variance estimate).

---

## Edge Cases and Failure Modes

| Scenario | Behavior |
|----------|----------|
| One experiment in a group fails mid-run | Group status = "partial"; stats exclude the failed run; UI shows which run failed |
| All experiments fail | Group status = "failed"; stats object contains all-zero/null values |
| User launches N=1 via `/replicate` | Treated as a group of one; behaves like single launch but is tracked in `replication_groups` |
| Server restarts mid-replication launch | The experiments already launched will resume via existing recovery path; the group will be "partial" until user manually re-runs missing experiments (auto-recovery of group not in scope v1) |
| Replication with `enable_audit=true` | Each experiment in the group spawns its own audit. Expected. |
| Gallery performance with 50+ groups | Paginate: default `limit=20`. Groups and standalone experiments are fetched in two separate requests; client merges and sorts by `created_at`. |

---

## Out of Scope (v1)

- Automatic re-run of failed replications within a group
- Confidence intervals (require n ≥ 30 for CLT; display stddev instead)
- Cross-group comparison (that is spec 013 — Heatmap)
- Replication of RPG mode experiments
- Cost estimate before launching N replications (add in v2)

---

## API Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/relay/replicate` | Launch N replications, create group |
| GET | `/api/replication-groups` | List all groups |
| GET | `/api/replication-groups/:id` | Group detail + live stats |

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `server/db.py` | Modify | New table, migration column, 5 new helpers |
| `server/routers/relay.py` | Modify | `replication_count` field, `/replicate` endpoint |
| `server/routers/replication.py` | Create | Group read endpoints |
| `server/app.py` | Modify | Mount replication router |
| `ui/src/api/types.ts` | Modify | New types |
| `ui/src/pages/Configure.tsx` | Modify | Replication count input, conditional POST target |
| `ui/src/pages/Gallery.tsx` | Modify | Group card type, fetch from both endpoints |
| `ui/src/pages/ReplicationGroup.tsx` | Create | Group detail page |
| `ui/src/App.tsx` | Modify | New route |

---

## Acceptance Criteria

- [ ] `POST /api/relay/replicate` with `replication_count=5` creates exactly 5 experiments
      linked to one replication group
- [ ] All 5 experiments have `replication_group_id` set in DB
- [ ] `GET /api/replication-groups/:id` returns correct `stats.vocab_count.mean` ± `stddev`
      after all experiments complete (verified by manual DB query)
- [ ] Gallery shows replication group as a single card with `n=5` badge
- [ ] Clicking the card navigates to `/replication/:id`
- [ ] Single-experiment launch via `/api/relay/start` is unaffected (regression test)
- [ ] Failed experiments are excluded from stats numerics, counted in `stats.failed`
- [ ] `replication_count=1` via `/replicate` creates a single-member group (no error)
