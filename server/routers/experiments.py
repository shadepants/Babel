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


@router.get("/memories")
async def list_memories(request: Request):
    """List all stored model-pair memories, newest first."""
    db = _get_db(request)
    return {"memories": await db.list_all_memories()}


@router.delete("/memories")
async def delete_memories(model_a: str, model_b: str, request: Request):
    """Delete all memory rows for a model pair."""
    db = _get_db(request)
    deleted = await db.delete_memories_for_pair(model_a, model_b)
    return {"deleted": deleted}


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


@router.get("/{experiment_id}/tree")
async def get_experiment_tree(experiment_id: str, request: Request):
    """Fetch the full fork lineage tree rooted at the given experiment.

    Returns a nested JSON structure where each node has a 'children' list.
    The root is the experiment with the given ID (which must have no parent,
    or be the deepest ancestor reachable from it).
    """
    db = _get_db(request)
    # Walk up to find the true root of this lineage
    row = await db.get_experiment(experiment_id)
    if row is None:
        raise HTTPException(404, "Experiment not found")
    # Traverse to root
    root_id = experiment_id
    visited: set[str] = set()
    while row and row.get("parent_experiment_id"):
        parent_id = row["parent_experiment_id"]
        if parent_id in visited:
            break  # cycle guard
        visited.add(root_id)
        root_id = parent_id
        row = await db.get_experiment(root_id)
    tree = await db.get_experiment_tree(root_id)
    if tree is None:
        raise HTTPException(404, "Experiment tree not found")
    return tree


@router.post("/{experiment_id}/documentary")
async def generate_documentary(experiment_id: str, request: Request):
    """Generate (or return cached) an AI documentary narrative for an experiment."""
    import asyncio
    import litellm
    from server.config import JUDGE_MODEL

    db = _get_db(request)
    experiment = await db.get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(404, "Experiment not found")

    # Return cached version immediately
    cached = await db.get_documentary(experiment_id)
    if cached:
        return {"documentary": cached}

    # Gather data
    turns = await db.get_turns(experiment_id)
    vocab = await db.get_vocabulary(experiment_id)
    mode = experiment.get("mode", "standard")
    preset = experiment.get("preset") or "custom"
    rounds_done = experiment.get("rounds_completed") or 0
    winner = experiment.get("winner")
    verdict = experiment.get("verdict_reasoning") or ""

    # Determine participants display
    import json
    participants_raw = experiment.get("participants_json")
    if participants_raw:
        try:
            pts = json.loads(participants_raw)
            participants_str = ", ".join(
                f"{p.get('name', p.get('model', 'agent'))} ({p.get('role', 'agent')})"
                for p in pts
            )
        except Exception:
            participants_str = f"{experiment.get('model_a')} vs {experiment.get('model_b')}"
    else:
        participants_str = f"{experiment.get('model_a')} vs {experiment.get('model_b')}"

    # Build turn excerpt (cap at ~4000 chars)
    turn_lines: list[str] = []
    char_budget = 4000
    for t in turns:
        line = f"[Round {t['round']}] {t['speaker']}: {t['content'][:300]}"
        if sum(len(l) for l in turn_lines) + len(line) > char_budget:
            turn_lines.append("... (truncated)")
            break
        turn_lines.append(line)
    turns_text = "\n".join(turn_lines)

    vocab_text = ", ".join(
        f"{w['word']} ({w.get('meaning', '')})" if w.get("meaning") else w["word"]
        for w in vocab[:12]
    ) or "none"

    if mode == "rpg":
        prompt = (
            f"You are a fantasy chronicler writing an epic campaign recap for a tabletop RPG session "
            f"conducted by AI agents.\n\n"
            f"CAMPAIGN: {preset} | ROUNDS: {rounds_done} | PARTY: {participants_str}\n\n"
            f"SESSION TRANSCRIPT (excerpted):\n{turns_text}\n\n"
            f"INVENTED VOCABULARY: {vocab_text}\n\n"
            f"Write a vivid campaign recap in 4 sections:\n"
            f"// THE SETTING\n// KEY MOMENTS\n// INVENTED LORE\n// THE VERDICT\n\n"
            f"Keep it under 600 words. Make it feel like a real campaign chronicle."
        )
    else:
        prompt = (
            f"You are a science journalist writing a short documentary article about a fascinating "
            f"AI linguistics experiment.\n\n"
            f"EXPERIMENT: {experiment_id} | PRESET: {preset} | ROUNDS: {rounds_done} | "
            f"PARTICIPANTS: {participants_str}\n\n"
            f"CONVERSATION TRANSCRIPT (excerpted):\n{turns_text}\n\n"
            f"VOCABULARY COINED: {vocab_text}\n\n"
            f"FINAL VERDICT: {winner or 'undecided'} — {verdict}\n\n"
            f"Write a compelling documentary narrative in 4 sections:\n"
            f"// THE EXPERIMENT\n// KEY MOMENTS\n// INVENTED VOCABULARY\n// THE VERDICT\n\n"
            f"Keep it under 600 words. Make it engaging and scientifically grounded."
        )

    response = await asyncio.to_thread(
        litellm.completion,
        model=JUDGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
        temperature=0.7,
    )
    text = response.choices[0].message.content or ""

    await db.save_documentary(experiment_id, text)
    return {"documentary": text}


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
