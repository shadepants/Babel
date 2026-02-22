"""Relay Router — start experiments and stream results via SSE.

Endpoints:
    POST /api/relay/start   → create experiment + launch relay background task
    GET  /api/relay/stream   → SSE stream of relay events (with keepalive)
    GET  /api/relay/history  → REST fallback for event history
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from server.config import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_MODEL_A,
    DEFAULT_MODEL_B,
    DEFAULT_ROUNDS,
    DEFAULT_SEED,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_TEMPERATURE,
    MODEL_REGISTRY,
    get_display_name,
)
from server.relay_engine import RelayAgent, run_relay

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relay", tags=["relay"])

KEEPALIVE_INTERVAL = 15  # seconds


# ── Request / Response Models ───────────────────────────────────────────

class RelayStartRequest(BaseModel):
    model_a: str = Field(default=DEFAULT_MODEL_A, description="litellm model string for agent A")
    model_b: str = Field(default=DEFAULT_MODEL_B, description="litellm model string for agent B")
    seed: str = Field(default=DEFAULT_SEED, description="Starting message / seed vocabulary")
    system_prompt: str = Field(default=DEFAULT_SYSTEM_PROMPT, description="System prompt for both agents")
    rounds: int = Field(default=DEFAULT_ROUNDS, ge=1, le=15, description="Number of conversation rounds")
    temperature: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=2.0)
    max_tokens: int = Field(default=DEFAULT_MAX_TOKENS, ge=100, le=4096)
    preset: str | None = Field(default=None, description="Preset name (if from Seed Lab)")


class RelayStartResponse(BaseModel):
    match_id: str
    model_a: str
    model_b: str
    rounds: int
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

@router.post("/start", response_model=RelayStartResponse)
async def start_relay(body: RelayStartRequest, request: Request):
    """Create a new experiment and launch the relay in the background."""
    db = _get_db(request)
    hub = _get_hub(request)

    # Create experiment record
    config = {
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
    }
    match_id = await db.create_experiment(
        model_a=body.model_a,
        model_b=body.model_b,
        seed=body.seed,
        system_prompt=body.system_prompt,
        rounds_planned=body.rounds,
        preset=body.preset,
        config=config,
    )

    # Build agents
    agent_a = RelayAgent(
        name=get_display_name(body.model_a),
        model=body.model_a,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
    )
    agent_b = RelayAgent(
        name=get_display_name(body.model_b),
        model=body.model_b,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
    )

    # Launch relay as background task (doesn't block the response)
    asyncio.create_task(
        run_relay(
            match_id=match_id,
            agent_a=agent_a,
            agent_b=agent_b,
            seed=body.seed,
            system_prompt=body.system_prompt,
            rounds=body.rounds,
            hub=hub,
            db=db,
        )
    )

    logger.info(
        "Relay started: %s — %s vs %s, %d rounds",
        match_id, agent_a.name, agent_b.name, body.rounds,
    )

    return RelayStartResponse(
        match_id=match_id,
        model_a=body.model_a,
        model_b=body.model_b,
        rounds=body.rounds,
        status="running",
    )


@router.get("/stream")
async def relay_stream(
    request: Request,
    match_id: str | None = None,
    include_history: bool = True,
):
    """Stream relay events via SSE with keepalive heartbeats.

    Query params:
        match_id         — filter to a specific experiment
        include_history  — replay recent events on connect (default: true)

    Client usage (JavaScript):
        const source = new EventSource('/api/relay/stream?match_id=abc123');
        source.onmessage = (e) => {
            const event = JSON.parse(e.data);
            console.log(event.type, event);
        };
    """
    hub = _get_hub(request)

    async def generate_with_keepalive():
        """Stream events with periodic keepalive comments.

        Uses asyncio.wait with two tasks instead of wait_for on __anext__().
        wait_for injects CancelledError into the generator on timeout,
        which kills the subscription. This approach is safe — the event
        task stays alive across keepalive cycles.
        """
        subscription = hub.subscribe(
            match_id=match_id,
            include_history=include_history,
        )
        event_iter = subscription.__aiter__()

        try:
            while True:
                # Create a fresh task for the next event
                event_task = asyncio.ensure_future(event_iter.__anext__())
                timer_task = asyncio.ensure_future(asyncio.sleep(KEEPALIVE_INTERVAL))

                done, pending = await asyncio.wait(
                    {event_task, timer_task},
                    return_when=asyncio.FIRST_COMPLETED,
                )

                # Cancel whichever didn't finish
                for task in pending:
                    task.cancel()

                if event_task in done:
                    try:
                        event = event_task.result()
                        yield f"data: {event.to_sse_data()}\n\n"
                    except StopAsyncIteration:
                        break
                else:
                    # Timer fired — send keepalive, loop back to wait for events
                    yield ": keepalive\n\n"

        except asyncio.CancelledError:
            logger.debug("SSE client disconnected (match_id=%s)", match_id)
        finally:
            # Ensure cleanup of the async generator
            await subscription.aclose()

    return StreamingResponse(
        generate_with_keepalive(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def relay_history(
    request: Request,
    match_id: str | None = None,
    limit: int = 50,
):
    """Get recent relay events (REST fallback for SSE)."""
    hub = _get_hub(request)
    if limit < 1 or limit > 500:
        raise HTTPException(400, "limit must be between 1 and 500")
    events = hub.get_history(match_id=match_id, limit=limit)
    return {"count": len(events), "events": events}


@router.get("/models")
async def list_models():
    """Return available models from the registry."""
    return {
        "models": [
            {"name": name, "model": model}
            for name, model in MODEL_REGISTRY.items()
        ]
    }
