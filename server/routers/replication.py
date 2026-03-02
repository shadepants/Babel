"""Replication Groups Router -- Spec 017.

Endpoints:
    GET /api/replication-groups           -> list all groups
    GET /api/replication-groups/:group_id -> group detail + live stats
"""

import json
import logging

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["replication"])


def _get_db(request: Request):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "Database not initialized")
    return db


@router.get("")
async def list_replication_groups(
    request: Request,
    limit: int = 20,
    offset: int = 0,
):
    """List replication groups, most recent first."""
    db = _get_db(request)
    if limit < 1 or limit > 100:
        raise HTTPException(400, "limit must be between 1 and 100")

    groups = await db.list_replication_groups(limit=limit, offset=offset)

    result = []
    for g in groups:
        exp_ids = json.loads(g.get("experiment_ids_json") or "[]")
        config = json.loads(g.get("config_snapshot_json") or "{}")
        result.append({
            "group_id": g["id"],
            "created_at": g["created_at"],
            "status": g["status"],
            "count": len(exp_ids),
            "experiment_ids": exp_ids,
            "preset": config.get("preset"),
            "model_a": config.get("model_a"),
            "model_b": config.get("model_b"),
        })

    return {"groups": result, "limit": limit, "offset": offset}


@router.get("/{group_id}")
async def get_replication_group(group_id: str, request: Request):
    """Return group metadata, per-experiment status, and aggregate statistics."""
    db = _get_db(request)

    group = await db.get_replication_group(group_id)
    if group is None:
        raise HTTPException(404, f"Replication group '{group_id}' not found")

    exp_ids = json.loads(group.get("experiment_ids_json") or "[]")
    config_snapshot = json.loads(group.get("config_snapshot_json") or "{}")

    # Collect per-experiment status
    experiments = []
    completed_count = 0
    running_count = 0
    failed_count = 0

    for exp_id in exp_ids:
        exp = await db.get_experiment(exp_id)
        if not exp:
            experiments.append({"id": exp_id, "status": "missing"})
            continue
        status = exp.get("status", "running")
        if status == "completed":
            completed_count += 1
        elif status in ("failed", "stopped"):
            failed_count += 1
        else:
            running_count += 1
        experiments.append({
            "id": exp["id"],
            "status": status,
            "rounds_completed": exp.get("rounds_completed", 0),
            "winner": exp.get("winner"),
            "created_at": exp.get("created_at"),
        })

    # Compute aggregate stats from completed experiments
    stats = await db.get_replication_group_stats(group_id)
    stats["failed"] = failed_count

    return {
        "group_id": group["id"],
        "status": group["status"],
        "count": len(exp_ids),
        "completed": completed_count,
        "running": running_count,
        "failed": failed_count,
        "experiments": experiments,
        "stats": stats,
        "config_snapshot": config_snapshot,
        "created_at": group["created_at"],
    }
