"""Experiments router — read-only endpoints for experiment data and vocabulary.

Separate from the relay router which handles lifecycle (start/stream).
"""

from fastapi import APIRouter, HTTPException, Request

from server.db import Database

router = APIRouter(tags=["experiments"])


def _get_db(request: Request) -> Database:
    return request.app.state.db


@router.get("/")
async def list_experiments(request: Request, limit: int = 50):
    """List recent experiments (most recent first)."""
    db = _get_db(request)
    return {"experiments": await db.list_experiments(limit=limit)}


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
    # Verify experiment exists
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")
    words = await db.get_vocabulary(experiment_id)
    return {"experiment_id": experiment_id, "words": words}
