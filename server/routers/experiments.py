"""Experiments router — read-only endpoints for experiment data, vocabulary, and analytics.

Separate from the relay router which handles lifecycle (start/stream).
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from server.db import Database

router = APIRouter(tags=["experiments"])

_VALID_STATUSES = frozenset({"running", "completed", "failed", "stopped"})


class _LabelBody(BaseModel):
    label: str | None = None


def _get_db(request: Request) -> Database:
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "Database not initialized")
    return db


@router.get("/")
async def list_experiments(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status: str | None = None,
):
    """List recent experiments (most recent first). Optional status filter and pagination."""
    if status and status not in _VALID_STATUSES:
        raise HTTPException(
            400,
            f"Invalid status '{status}'. Valid values: {sorted(_VALID_STATUSES)}",
        )
    db = _get_db(request)
    return {"experiments": await db.list_experiments(limit=limit, offset=offset, status=status)}


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str, request: Request):
    """Fetch experiment metadata."""
    db = _get_db(request)
    row = await db.get_experiment(experiment_id)
    if row is None:
        raise HTTPException(404, "Experiment not found")
    return row


@router.get("/{experiment_id}/vocabulary")
async def get_vocabulary(experiment_id: str, request: Request):
    """Fetch all extracted vocabulary for an experiment."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    words = await db.get_vocabulary(experiment_id)
    return {"experiment_id": experiment_id, "words": words}


@router.get("/{experiment_id}/stats")
async def get_experiment_stats(experiment_id: str, request: Request):
    """Pre-aggregated analytics: per-round latency/tokens, vocab growth, totals."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    return await db.get_experiment_stats(experiment_id)


@router.get("/{experiment_id}/turns")
async def get_experiment_turns(experiment_id: str, request: Request):
    """Fetch all turns with full content (for export)."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    turns = await db.get_turns(experiment_id)
    return {"experiment_id": experiment_id, "turns": turns}


@router.get("/{experiment_id}/radar")
async def get_experiment_radar(experiment_id: str, request: Request):
    """Radar chart data for both models in an experiment (normalized 0-1)."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    data = await db.get_model_radar_stats(experiment_id)
    return {"experiment_id": experiment_id, "models": data}


@router.get("/{experiment_id}/scores")
async def get_experiment_scores(experiment_id: str, request: Request):
    """Fetch judge scores for all turns in an experiment."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    scores = await db.get_turn_scores(experiment_id)
    return {"experiment_id": experiment_id, "scores": scores}


@router.patch("/{experiment_id}/label")
async def set_experiment_label(experiment_id: str, body: _LabelBody, request: Request):
    """Set or clear a human-readable nickname for an experiment."""
    db = _get_db(request)
    row = await db.get_experiment(experiment_id)
    if row is None:
        raise HTTPException(404, "Experiment not found")
    await db.set_label(experiment_id, body.label)
    return {"id": experiment_id, "label": body.label}


@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str, request: Request):
    """Delete an experiment and all associated turns/vocabulary. Only non-running experiments."""
    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    if experiment["status"] == "running":
        raise HTTPException(409, "Cannot delete a running experiment. Stop it first.")
    await db.delete_experiment(experiment_id)
    return {"deleted": experiment_id}
