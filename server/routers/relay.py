"""Relay Router — start experiments and stream results via SSE.

Endpoints:
    POST /api/relay/start   → create experiment + launch relay background task
    GET  /api/relay/stream   → SSE stream of relay events (with keepalive)
    GET  /api/relay/history  → REST fallback for event history
"""

from __future__ import annotations

import asyncio
import logging

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

# Allowed model strings — validated at request time
_ALLOWED_MODELS: frozenset[str] = frozenset(MODEL_REGISTRY.values())
from server.relay_engine import RelayAgent, run_relay

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relay", tags=["relay"])

KEEPALIVE_INTERVAL = 15  # seconds

# In-memory registry of running relay tasks and their cancel events
_running_relays: dict[str, tuple[asyncio.Task, asyncio.Event]] = {}


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
    turn_delay_seconds: float = Field(default=2.0, ge=0.0, le=10.0, description="Seconds to pause between turns")


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

    # Validate model strings against the registry
    for model in (body.model_a, body.model_b):
        if model not in _ALLOWED_MODELS:
            raise HTTPException(400, f"Model '{model}' is not in the allowed registry")

    # Resolve preset if specified (server is authoritative source of truth)
    seed = body.seed
    system_prompt = body.system_prompt
    if body.preset:
        presets = getattr(request.app.state, "presets", {})
        preset_data = presets.get(body.preset)
        if preset_data:
            seed = preset_data.get("seed", seed)
            system_prompt = preset_data.get("system_prompt", system_prompt)

    # Create experiment record
    config = {
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
    }
    match_id = await db.create_experiment(
        model_a=body.model_a,
        model_b=body.model_b,
        seed=seed,
        system_prompt=system_prompt,
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
    cancel_event = asyncio.Event()
    task = asyncio.create_task(
        run_relay(
            match_id=match_id,
            agent_a=agent_a,
            agent_b=agent_b,
            seed=seed,
            system_prompt=system_prompt,
            rounds=body.rounds,
            hub=hub,
            db=db,
            turn_delay_seconds=body.turn_delay_seconds,
            cancel_event=cancel_event,
            preset=body.preset,
        )
    )
    _running_relays[match_id] = (task, cancel_event)

    def _cleanup_task(t: asyncio.Task):
        _running_relays.pop(match_id, None)
    task.add_done_callback(_cleanup_task)

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


@router.post("/{match_id}/stop")
async def stop_relay(match_id: str, request: Request):
    """Stop a running experiment. Sets cancel flag checked between rounds."""
    entry = _running_relays.get(match_id)
    if not entry:
        # Check if it exists but already finished
        db = _get_db(request)
        exp = await db.get_experiment(match_id)
        if not exp:
            raise HTTPException(404, "Experiment not found")
        raise HTTPException(409, f"Experiment is not running (status: {exp['status']})")

    _task, cancel_event = entry
    cancel_event.set()
    return {"match_id": match_id, "status": "stopping"}


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
    # Support selective replay: browser sends Last-Event-ID header on reconnect
    raw_last_id = request.headers.get("last-event-id")
    last_event_id: int | None = int(raw_last_id) if raw_last_id and raw_last_id.isdigit() else None

    async def generate_with_keepalive():
        """Stream events with periodic keepalive comments.

        Uses an asyncio.Queue to decouple the hub subscription from
        the keepalive timeout. This avoids cancelling __anext__() on
        the async generator, which would inject CancelledError and
        permanently close the subscription.
        """
        q: asyncio.Queue = asyncio.Queue()

        async def consume_hub():
            try:
                async for evt in hub.subscribe(
                    match_id=match_id,
                    include_history=include_history,
                    last_event_id=last_event_id,
                ):
                    await q.put(evt)
            except Exception:
                pass
            finally:
                await q.put(None)  # Sentinel: subscription ended

        task = asyncio.create_task(consume_hub())
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=KEEPALIVE_INTERVAL)
                    if event is None:
                        break  # Subscription ended
                    yield f"id: {event.event_id}\ndata: {event.to_sse_data()}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            logger.debug("SSE client disconnected (match_id=%s)", match_id)
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


@router.get("/models/status")
async def check_model_status():
    """Check which models are available by testing API key presence.

    Does NOT make LLM calls — just checks env vars for known provider keys.
    """
    import os

    provider_keys = {
        "anthropic": "ANTHROPIC_API_KEY",
        "gemini": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "groq": "GROQ_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "sambanova": "SAMBANOVA_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }

    def get_provider(model_str: str) -> str:
        return model_str.split("/")[0] if "/" in model_str else "unknown"

    results = []
    for name, model in MODEL_REGISTRY.items():
        provider = get_provider(model)
        env_var = provider_keys.get(provider)
        key_val = os.environ.get(env_var, "") if env_var else ""
        available = bool(key_val)
        # C6: Show first4...last4 of the loaded key so the user can verify it
        key_preview: str | None = None
        if key_val:
            key_preview = f"{key_val[:4]}...{key_val[-4:]}" if len(key_val) >= 8 else "****"
        results.append({
            "name": name,
            "model": model,
            "provider": provider,
            "available": available,
            "env_var": env_var or "unknown",
            "key_preview": key_preview,
        })

    return {"models": results}


@router.get("/env-status")
async def get_env_status():
    """Check whether a .env file exists at the project root (C5)."""
    import os
    env_path = os.path.join(os.getcwd(), ".env")
    return {"env_file_found": os.path.isfile(env_path)}


@router.post("/models/test/{provider}")
async def test_provider_connection(provider: str):
    """Test a provider's API key by making a tiny LLM call.

    Returns {ok: true, latency_ms: N} on success or {ok: false, error: str} on failure.
    """
    import time
    import litellm

    # Find the first model for this provider
    model_str = None
    for _name, model in MODEL_REGISTRY.items():
        if model.startswith(f"{provider}/"):
            model_str = model
            break
    if not model_str:
        raise HTTPException(404, f"No models found for provider '{provider}'")

    try:
        start = time.time()
        await litellm.acompletion(
            model=model_str,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=1,
            temperature=0,
        )
        latency_ms = round((time.time() - start) * 1000)
        return {"ok": True, "provider": provider, "latency_ms": latency_ms}
    except Exception as e:
        return {"ok": False, "provider": provider, "error": str(e)}
