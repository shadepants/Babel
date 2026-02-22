"""Tournament Router — create and monitor multi-model tournaments.

Endpoints:
    POST /api/tournaments/start       → create tournament + launch sequential matches
    GET  /api/tournaments/             → list all tournaments
    GET  /api/tournaments/{id}         → tournament details + matches
    GET  /api/tournaments/{id}/leaderboard → per-model aggregated stats + radar data
    GET  /api/tournaments/{id}/stream  → SSE stream for tournament events
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from server.config import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_ROUNDS,
    DEFAULT_SEED,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_TEMPERATURE,
    MODEL_REGISTRY,
)
from server.tournament_engine import TournamentEvent, run_tournament

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tournaments"])

KEEPALIVE_INTERVAL = 15

# Allowed model strings (validated against registry at startup)
_ALLOWED_MODELS: frozenset[str] = frozenset(MODEL_REGISTRY.values())

# Keep references to active tournament tasks so GC can't collect them mid-run
_active_tasks: set[asyncio.Task] = set()

# Terminal SSE event types — stream closes after receiving one of these
_TERMINAL_EVENTS = frozenset({TournamentEvent.COMPLETE, TournamentEvent.ERROR})


# ── Request / Response Models ───────────────────────────────────────────

class TournamentStartRequest(BaseModel):
    name: str = Field(description="Tournament display name")
    models: list[str] = Field(
        min_length=3,
        max_length=10,
        description="List of litellm model strings (min 3, max 10)",
    )
    preset: str | None = Field(default=None, description="Preset name (optional)")
    seed: str = Field(default=DEFAULT_SEED)
    system_prompt: str = Field(default=DEFAULT_SYSTEM_PROMPT)
    rounds: int = Field(default=DEFAULT_ROUNDS, ge=1, le=15)
    temperature: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=2.0)
    max_tokens: int = Field(default=DEFAULT_MAX_TOKENS, ge=100, le=4096)


class TournamentStartResponse(BaseModel):
    tournament_id: str
    name: str
    total_matches: int
    models: list[str]
    status: str


# ── Helpers ─────────────────────────────────────────────────────────────

def _get_hub(request: Request):
    hub = getattr(request.app.state, "hub", None)
    if hub is None:
        raise HTTPException(503, "Event hub not initialized")
    return hub


def _get_db(request: Request):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "Database not initialized")
    return db


# ── Endpoints ───────────────────────────────────────────────────────────

@router.post("/start", response_model=TournamentStartResponse)
async def start_tournament(body: TournamentStartRequest, request: Request):
    """Create a tournament and launch all matches as a background task."""
    db = _get_db(request)
    hub = _get_hub(request)

    # Validate model strings against the registry
    for model in body.models:
        if model not in _ALLOWED_MODELS:
            raise HTTPException(400, f"Model '{model}' is not in the allowed registry")

    # Resolve preset if specified
    seed = body.seed
    system_prompt = body.system_prompt
    if body.preset:
        presets = getattr(request.app.state, "presets", {})
        preset_data = presets.get(body.preset)
        if preset_data:
            seed = preset_data.get("seed", seed)
            system_prompt = preset_data.get("system_prompt", system_prompt)

    config = {
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
    }

    tournament_id = await db.create_tournament(
        name=body.name,
        models=body.models,
        seed=seed,
        system_prompt=system_prompt,
        rounds=body.rounds,
        preset=body.preset,
        config=config,
    )

    # Store task reference so GC cannot collect it before it completes
    task = asyncio.create_task(run_tournament(tournament_id, hub, db))
    _active_tasks.add(task)
    task.add_done_callback(_active_tasks.discard)

    tournament = await db.get_tournament(tournament_id)

    logger.info(
        "Tournament %s started: %s — %d models, %d matches",
        tournament_id, body.name, len(body.models), tournament["total_matches"],
    )

    return TournamentStartResponse(
        tournament_id=tournament_id,
        name=body.name,
        total_matches=tournament["total_matches"],
        models=body.models,
        status="pending",
    )


@router.get("/")
async def list_tournaments(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """List all tournaments, most recent first."""
    db = _get_db(request)
    return {"tournaments": await db.list_tournaments(limit=limit, offset=offset)}


@router.get("/{tournament_id}")
async def get_tournament(tournament_id: str, request: Request):
    """Fetch tournament details including match list."""
    db = _get_db(request)
    tournament = await db.get_tournament(tournament_id)
    if not tournament:
        raise HTTPException(404, "Tournament not found")
    matches = await db.get_tournament_matches(tournament_id)
    return {**tournament, "matches": matches}


@router.get("/{tournament_id}/leaderboard")
async def get_tournament_leaderboard(tournament_id: str, request: Request):
    """Aggregated per-model stats with normalized radar chart axes."""
    db = _get_db(request)
    tournament = await db.get_tournament(tournament_id)
    if not tournament:
        raise HTTPException(404, "Tournament not found")
    entries = await db.get_tournament_leaderboard(tournament_id)
    return {"tournament_id": tournament_id, "entries": entries}


@router.get("/{tournament_id}/stream")
async def tournament_stream(
    tournament_id: str,
    request: Request,
    include_history: bool = False,
):
    """SSE stream for tournament-level events.

    Tournament events use match_id=tournament_id, so the existing
    EventHub filter works. Individual relay events for each experiment
    use the experiment's own match_id (watch via /api/relay/stream).

    The stream self-closes after tournament.complete or tournament.error
    so clients don't need to disconnect manually.
    """
    hub = _get_hub(request)

    async def generate_with_keepalive():
        q: asyncio.Queue = asyncio.Queue()

        async def consume_hub():
            try:
                async for evt in hub.subscribe(
                    match_id=tournament_id,
                    include_history=include_history,
                ):
                    await q.put(evt)
            except Exception:
                pass
            finally:
                await q.put(None)

        task = asyncio.create_task(consume_hub())
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=KEEPALIVE_INTERVAL)
                    if event is None:
                        break
                    yield f"data: {event.to_sse_data()}\n\n"
                    # Self-close on terminal events
                    if event.event_type in _TERMINAL_EVENTS:
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            logger.debug("Tournament SSE client disconnected (%s)", tournament_id)
        finally:
            task.cancel()

    return StreamingResponse(
        generate_with_keepalive(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
