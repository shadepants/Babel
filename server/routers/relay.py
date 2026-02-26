"""Relay Router — start experiments and stream results via SSE.

Endpoints:
    POST /api/relay/start   -> create experiment + launch relay background task
    GET  /api/relay/stream   -> SSE stream of relay events (with keepalive)
    GET  /api/relay/history  -> REST fallback for event history
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from server.config import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_MODEL_A,
    DEFAULT_MODEL_B,
    DEFAULT_ROUNDS,
    DEFAULT_RPG_SYSTEM_PROMPT,
    DEFAULT_SEED,
    DEFAULT_SCORING_ENABLED,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_TEMPERATURE,
    DEFAULT_VERDICT_ENABLED,
    JUDGE_MODEL,
    MODEL_REGISTRY,
    get_display_name,
)

# Allowed model strings — validated at request time
_ALLOWED_MODELS: frozenset[str] = frozenset(MODEL_REGISTRY.values())
from server.relay_engine import PersonaRecord, RelayAgent, run_relay

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relay", tags=["relay"])

KEEPALIVE_INTERVAL = 15  # seconds

# In-memory registry of running relay tasks and their cancel events
_running_relays: dict[str, tuple[asyncio.Task, asyncio.Event, asyncio.Event]] = {}


# -- Request / Response Models -----------------------------------------------

class AgentConfig(BaseModel):
    """Config for one agent in an N-way relay (Phase 15-A)."""
    model: str
    temperature: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=2.0)
    name: str | None = Field(default=None, description="Display name override (defaults to registry name)")


class RelayStartRequest(BaseModel):
    # Phase 15-A: N-way agents list (preferred)
    agents: list[AgentConfig] | None = Field(
        default=None,
        description="2-4 agent configs. If provided, overrides model_a/model_b/temperature_a/temperature_b.",
    )
    # Legacy 2-agent fields (still supported for backward compat)
    model_a: str = Field(default=DEFAULT_MODEL_A, description="litellm model string for agent A")
    model_b: str = Field(default=DEFAULT_MODEL_B, description="litellm model string for agent B")
    seed: str = Field(default=DEFAULT_SEED, description="Starting message / seed vocabulary")
    system_prompt: str = Field(default=DEFAULT_SYSTEM_PROMPT, description="System prompt for both agents")
    rounds: int = Field(default=DEFAULT_ROUNDS, ge=1, le=15, description="Number of conversation rounds")
    temperature_a: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=2.0)
    temperature_b: float = Field(default=DEFAULT_TEMPERATURE, ge=0.0, le=2.0)
    max_tokens: int = Field(default=DEFAULT_MAX_TOKENS, ge=100, le=4096)
    preset: str | None = Field(default=None, description="Preset name (if from Seed Lab)")
    turn_delay_seconds: float = Field(default=2.0, ge=0.0, le=10.0, description="Seconds to pause between turns")
    judge_model: str | None = Field(default=None, description="litellm model string for the judge (None = use server default)")
    enable_scoring: bool = Field(default=DEFAULT_SCORING_ENABLED, description="Fire-and-forget per-turn scoring via judge model")
    enable_verdict: bool = Field(default=DEFAULT_VERDICT_ENABLED, description="Final verdict from judge after all rounds")
    enable_memory: bool = Field(default=False, description="Inject past session vocabulary as memory context")
    observer_model: str | None = Field(default=None, description="Optional observer/narrator model (None = disabled)")
    observer_interval: int = Field(default=3, ge=1, le=10, description="Observer fires every N turns")
    # Phase 13b: RPG mode
    mode: str = Field(default="standard", description="'standard' or 'rpg'")
    participants: list[dict] | None = Field(default=None, description="RPG participant configs [{name, model, role}]")
    # Phase 14-B: experiment forking
    initial_history: list[dict] | None = Field(default=None, description="Pre-seeded turns from a forked experiment")
    parent_experiment_id: str | None = Field(default=None, description="ID of the source experiment being forked")
    fork_at_round: int | None = Field(default=None, description="Round count at which the fork occurred")
    # Phase 16: persona IDs (parallel to agents list or legacy A/B slots)
    persona_ids: list[str | None] | None = Field(default=None, description="Optional persona ID per agent slot")
    # Campaign config for RPG mode (tone, setting, difficulty, hook)
    rpg_config: dict | None = Field(default=None, description="RPG campaign parameters")


class RelayStartResponse(BaseModel):
    match_id: str
    model_a: str
    model_b: str
    rounds: int
    status: str


# -- Helpers -----------------------------------------------------------------

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


# -- Endpoints ---------------------------------------------------------------

@router.post("/start", response_model=RelayStartResponse)
async def start_relay(body: RelayStartRequest, request: Request):
    """Create a new experiment and launch the relay in the background."""
    db = _get_db(request)
    hub = _get_hub(request)

    # -- Resolve agents list (N-way preferred; fall back to legacy model_a/model_b) --
    if body.agents and len(body.agents) >= 2:
        if len(body.agents) > 4:
            raise HTTPException(400, "Maximum 4 agents supported")
        for ac in body.agents:
            if ac.model not in _ALLOWED_MODELS:
                raise HTTPException(400, f"Model '{ac.model}' is not in the allowed registry")
        resolved_agents = body.agents
    else:
        # Legacy 2-agent path — validate model_a / model_b
        for model in (body.model_a, body.model_b):
            if model not in _ALLOWED_MODELS:
                raise HTTPException(400, f"Model '{model}' is not in the allowed registry")
        resolved_agents = None  # signals "use legacy model_a/model_b path"

    # Validate model strings against the registry (legacy path guard kept above)
    if resolved_agents is None:
        pass  # already validated above

    # Resolve judge model — use request value if provided, else fall back to server default
    resolved_judge = body.judge_model or JUDGE_MODEL
    if (body.enable_scoring or body.enable_verdict) and resolved_judge not in _ALLOWED_MODELS:
        raise HTTPException(400, f"Judge model '{resolved_judge}' is not in the allowed registry")
    if body.observer_model and body.observer_model not in _ALLOWED_MODELS:
        raise HTTPException(400, f"Observer model '{body.observer_model}' is not in the allowed registry")

    # Resolve preset if specified (server is authoritative source of truth)
    seed = body.seed
    system_prompt = body.system_prompt
    if body.preset:
        presets = getattr(request.app.state, "presets", {})
        preset_data = presets.get(body.preset)
        if preset_data:
            seed = preset_data.get("seed", seed)
            system_prompt = preset_data.get("system_prompt", system_prompt)

    # RPG mode: swap out the conlang default for an RPG-appropriate system prompt
    # (only when the caller hasn't provided a custom prompt)
    if body.mode == "rpg" and system_prompt == DEFAULT_SYSTEM_PROMPT:
        system_prompt = DEFAULT_RPG_SYSTEM_PROMPT

    # Create experiment record
    import json as _json
    config = {
        "temperature_a": body.temperature_a,
        "temperature_b": body.temperature_b,
        "max_tokens": body.max_tokens,
        # Full recovery config -- used by recover_stale_sessions() on server restart
        "recovery": {
            "mode": body.mode,
            "agents": (
                [{"model": ac.model, "temperature": ac.temperature, "name": ac.name}
                 for ac in resolved_agents]
                if resolved_agents else
                [{"model": body.model_a, "temperature": body.temperature_a, "name": None},
                 {"model": body.model_b, "temperature": body.temperature_b, "name": None}]
            ),
            "turn_delay_seconds": body.turn_delay_seconds,
            "preset": body.preset,
            "enable_scoring": body.enable_scoring,
            "enable_verdict": body.enable_verdict,
            "enable_memory": body.enable_memory,
            "observer_model": body.observer_model,
            "observer_interval": body.observer_interval,
            "participants": body.participants,
            "rpg_config": body.rpg_config,
        },
    }
    participants_json = _json.dumps(body.participants) if body.participants else None
    # Serialise agents list for create_experiment (it handles model_a/model_b population)
    agents_dicts = (
        [{"model": ac.model, "temperature": ac.temperature, "name": ac.name}
         for ac in resolved_agents]
        if resolved_agents else None
    )
    match_id = await db.create_experiment(
        model_a=body.model_a,
        model_b=body.model_b,
        seed=seed,
        system_prompt=system_prompt,
        rounds_planned=body.rounds,
        preset=body.preset,
        config=config,
        temperature_a=body.temperature_a,
        temperature_b=body.temperature_b,
        judge_model=resolved_judge if (body.enable_scoring or body.enable_verdict) else None,
        enable_scoring=body.enable_scoring,
        enable_verdict=body.enable_verdict,
        mode=body.mode,
        participants_json=participants_json,
        parent_experiment_id=body.parent_experiment_id,
        fork_at_round=body.fork_at_round,
        agents=agents_dicts,
    )

    cancel_event = asyncio.Event()

    # -- RPG mode: launch rpg_engine instead of relay --
    if body.mode == "rpg" and body.participants:
        # Validate participant models against the registry (skip "human" slots)
        for p in body.participants:
            p_model = p.get("model") if isinstance(p, dict) else getattr(p, "model", None)
            if p_model and p_model != "human" and p_model not in _ALLOWED_MODELS:
                raise HTTPException(400, f"Participant model '{p_model}' is not in the allowed registry")

        human_event = asyncio.Event()
        request.app.state.human_events[match_id] = human_event

        from server.rpg_engine import run_rpg_match
        task = asyncio.create_task(run_rpg_match(
            match_id=match_id,
            participants=body.participants,
            seed=seed,
            system_prompt=system_prompt,
            rounds=body.rounds,
            hub=hub,
            db=db,
            human_event=human_event,
            cancel_event=cancel_event,
            preset=body.preset,
            participant_persona_ids=body.persona_ids,
                        rpg_config=body.rpg_config,
                        background_tasks=request.app.state.background_tasks,
                    )
                )
            
        resume_event = asyncio.Event()
        resume_event.set()
        _running_relays[match_id] = (task, cancel_event, resume_event)

        def _cleanup_rpg(t: asyncio.Task):
            _running_relays.pop(match_id, None)
            request.app.state.human_events.pop(match_id, None)
        task.add_done_callback(_cleanup_rpg)

        logger.info(
            "RPG started: %s -- %d participants, %d rounds",
            match_id, len(body.participants), body.rounds,
        )

        return RelayStartResponse(
            match_id=match_id,
            model_a=body.model_a,
            model_b=body.model_b,
            rounds=body.rounds,
            status="running",
        )

    # -- Standard relay mode --
    # Build RelayAgent list: N-way if agents provided, else legacy 2-agent
    if resolved_agents:
        relay_agents = [
            RelayAgent(
                name=ac.name or get_display_name(ac.model),
                model=ac.model,
                temperature=ac.temperature,
                max_tokens=body.max_tokens,
            )
            for ac in resolved_agents
        ]
    else:
        relay_agents = [
            RelayAgent(
                name=get_display_name(body.model_a),
                model=body.model_a,
                temperature=body.temperature_a,
                max_tokens=body.max_tokens,
            ),
            RelayAgent(
                name=get_display_name(body.model_b),
                model=body.model_b,
                temperature=body.temperature_b,
                max_tokens=body.max_tokens,
            ),
        ]

    # Phase 16: attach personas to agents
    if body.persona_ids:
        for i, pid in enumerate(body.persona_ids):
            if pid and i < len(relay_agents):
                p_data = await db.get_persona(pid)
                if p_data:
                    relay_agents[i].persona = PersonaRecord(
                        id=p_data["id"],
                        name=p_data["name"],
                        personality=p_data["personality"],
                        backstory=p_data["backstory"],
                    )

    # Launch relay as background task (doesn't block the response)
    resume_event = asyncio.Event()
    resume_event.set()  # Initially running (not paused)
    task = asyncio.create_task(
        run_relay(
            match_id=match_id,
            agents=relay_agents,
            seed=seed,
            system_prompt=system_prompt,
            rounds=body.rounds,
            hub=hub,
            db=db,
            turn_delay_seconds=body.turn_delay_seconds,
            cancel_event=cancel_event,
            resume_event=resume_event,
            preset=body.preset,
            judge_model=resolved_judge if (body.enable_scoring or body.enable_verdict) else None,
            enable_scoring=body.enable_scoring,
            enable_verdict=body.enable_verdict,
            enable_memory=body.enable_memory,
            observer_model=body.observer_model,
            observer_interval=body.observer_interval,
            initial_history=body.initial_history,
            parent_experiment_id=body.parent_experiment_id,
            background_tasks=request.app.state.background_tasks,
        )
    )
    _running_relays[match_id] = (task, cancel_event, resume_event)

    def _cleanup_task(t: asyncio.Task):
        _running_relays.pop(match_id, None)
    task.add_done_callback(_cleanup_task)

    agent_names = " / ".join(a.name for a in relay_agents)
    logger.info(
        "Relay started: %s -- %s, %d rounds",
        match_id, agent_names, body.rounds,
    )

    return RelayStartResponse(
        match_id=match_id,
        model_a=relay_agents[0].model,
        model_b=relay_agents[1].model if len(relay_agents) > 1 else relay_agents[0].model,
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

    _task, cancel_event, _resume = entry
    cancel_event.set()
    return {"match_id": match_id, "status": "stopping"}


@router.post("/{match_id}/pause")
async def pause_relay(match_id: str):
    """Pause a running experiment between turns."""
    entry = _running_relays.get(match_id)
    if not entry:
        raise HTTPException(404, "Experiment is not running")
    _task, _cancel, resume_event = entry
    resume_event.clear()
    return {"match_id": match_id, "status": "pausing"}


@router.post("/{match_id}/resume")
async def resume_relay(match_id: str):
    """Resume a paused experiment."""
    entry = _running_relays.get(match_id)
    if not entry:
        raise HTTPException(404, "Experiment is not running")
    _task, _cancel, resume_event = entry
    resume_event.set()
    return {"match_id": match_id, "status": "running"}


class InjectTurnRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Human turn content to inject")
    speaker: str = Field(default="Human", description="Speaker name for the injected turn")


@router.post("/{match_id}/inject")
async def inject_turn(match_id: str, body: InjectTurnRequest, request: Request):
    """Inject a human turn. Works for both paused standard relays and RPG mode."""
    entry = _running_relays.get(match_id)
    if not entry:
        raise HTTPException(404, "Experiment is not running")
    db = _get_db(request)
    hub = _get_hub(request)
    from server.relay_engine import RelayEvent

    # Infer round number from current turn count
    turns = await db.get_turns(match_id)
    round_num = len(turns) // 2 + 1

    # -- RPG mode: save turn then signal the engine to continue --
    human_events = getattr(request.app.state, "human_events", {})
    if match_id in human_events:
        await db.add_turn(
            experiment_id=match_id,
            round_num=round_num,
            speaker=body.speaker,
            model="human",
            content=body.content,
        )
        hub.publish(RelayEvent.TURN, {
            "match_id": match_id,
            "speaker": body.speaker,
            "model": "human",
            "content": body.content,
            "round": round_num,
        })
        human_events[match_id].set()
        return {"match_id": match_id, "round": round_num, "status": "injected"}

    # -- Standard relay mode: must be paused first --
    _task, _cancel, resume_event = entry
    if resume_event.is_set():
        raise HTTPException(409, "Experiment must be paused before injecting a turn")

    # Save to DB
    await db.add_turn(
        experiment_id=match_id,
        round_num=round_num,
        speaker=body.speaker,
        model="human",
        content=body.content,
    )

    # Publish SSE event so the UI shows it immediately
    hub.publish(RelayEvent.TURN, {
        "match_id": match_id,
        "speaker": body.speaker,
        "model": "human",
        "content": body.content,
        "round": round_num,
    })
    return {"match_id": match_id, "round": round_num, "status": "injected"}


@router.get("/{match_id}/rpg-context")
async def get_rpg_context(match_id: str, request: Request):
    """Return the current RPG session context: cold summary + world state.

    Called by the frontend to power the 'Story So Far' panel and world
    state sidebar. Returns empty objects gracefully if not yet generated.
    """
    db = _get_db(request)

    cold_row = await db.get_latest_cold_summary(match_id)
    world_row = await db.get_world_state(match_id)

    world_data: dict = {}
    if world_row:
        try:
            world_data = json.loads(world_row) if isinstance(world_row, str) else world_row
        except (json.JSONDecodeError, TypeError):
            world_data = {}

    return {
        "match_id": match_id,
        "cold_summary": cold_row or None,
        "world_state": world_data,
    }


@router.get("/stream")
async def relay_stream(
    request: Request,
    match_id: str | None = None,
    include_history: bool = True,
):
    """Stream relay events via SSE with keepalive heartbeats.

    Query params:
        match_id         -- filter to a specific experiment
        include_history  -- replay recent events on connect (default: true)

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

    Does NOT make LLM calls -- just checks env vars for known provider keys.
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


# -- API Key Management ------------------------------------------------------

_ALLOWED_ENV_VARS: frozenset[str] = frozenset({
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "DEEPSEEK_API_KEY",
    "GROQ_API_KEY",
    "MISTRAL_API_KEY",
    "SAMBANOVA_API_KEY",
    "OPENROUTER_API_KEY",
    "CEREBRAS_API_KEY",
})


class SetKeyRequest(BaseModel):
    env_var: str
    value: str


@router.post("/keys")
async def set_api_key(body: SetKeyRequest):
    """Write an API key to .env and update os.environ immediately.

    The key takes effect for new LLM calls without restarting the server.
    Only env vars in the provider allowlist are accepted.
    """
    import os
    from pathlib import Path

    if body.env_var not in _ALLOWED_ENV_VARS:
        raise HTTPException(400, f"Unknown env var '{body.env_var}'. Must be one of: {sorted(_ALLOWED_ENV_VARS)}")
    value = body.value.strip()
    if not value:
        raise HTTPException(400, "Key value cannot be empty")

    # Write to .env so the key persists after restart
    env_path = Path(os.getcwd()) / ".env"
    try:
        from dotenv import set_key
        set_key(str(env_path), body.env_var, value, quote_mode="never")
    except Exception as exc:
        raise HTTPException(500, f"Failed to write .env: {exc}") from exc

    # Update current process immediately -- no restart required
    os.environ[body.env_var] = value

    preview = f"{value[:4]}...{value[-4:]}" if len(value) >= 8 else "****"
    return {"ok": True, "env_var": body.env_var, "key_preview": preview}


# -- Startup Recovery --------------------------------------------------------

async def recover_stale_sessions(hub, db, background_tasks: set[asyncio.Task] | None = None, min_age_minutes: int = 3) -> int:
    """On startup: resume or mark-failed any sessions stuck in 'running' from a prior crash.

    Standard (non-RPG) sessions are fully recoverable: agents are reconstructed
    from config_json.recovery, completed turns are replayed as initial_history,
    and the relay resumes from rounds_completed + 1.

    RPG sessions are too stateful to recover cleanly -- they are marked 'failed'.
    Returns the number of sessions successfully resumed.
    """
    import json as _json

    stale = await db.get_stale_running_sessions(min_age_minutes=min_age_minutes)
    if not stale:
        return 0

    logger.info("Found %d stale running session(s) -- attempting recovery", len(stale))
    recovered = 0

    for session in stale:
        match_id = session["id"]
        try:
            config = _json.loads(session.get("config_json") or "{}")
            recovery = config.get("recovery", {})

            # -- 1. RPG SESSION RECOVERY --
            if recovery.get("mode") == "rpg" or recovery.get("participants"):
                rpg_state = await db.get_rpg_state(match_id)
                if not rpg_state:
                    await db.update_experiment_status(match_id, "failed")
                    logger.info("Marked RPG session %s as failed (no rpg_state found)", match_id)
                    continue

                cancel_event = asyncio.Event()
                human_event = asyncio.Event()
                
                if rpg_state["is_awaiting_human"]:
                    human_event.clear()
                else:
                    human_event.set()

                from server.rpg_engine import run_rpg_match
                
                turns_done = session.get("rounds_completed") or 0
                rounds_total = session.get("rounds_planned") or 5
                # rounds parameter in run_rpg_match is 'total rounds to run', 
                # but engines treat it as 'remaining rounds' from start_round.
                # Here we calculate rounds remaining to match the planned total.
                rounds_remaining = rounds_total - (rpg_state["current_round"] - 1)

                task = asyncio.create_task(run_rpg_match(
                    match_id=match_id,
                    participants=recovery.get("participants", []),
                    seed=session["seed"],
                    system_prompt=session["system_prompt"],
                    rounds=rounds_remaining,
                    hub=hub,
                    db=db,
                    human_event=human_event,
                    cancel_event=cancel_event,
                    preset=recovery.get("preset"),
                    rpg_config=recovery.get("rpg_config"),
                    start_round=rpg_state["current_round"],
                    start_index=rpg_state["current_speaker_idx"],
                    background_tasks=background_tasks,
                ))
                
                def _rpg_cleanup(t: asyncio.Task, mid: str = match_id) -> None:
                    _running_relays.pop(mid, None)
                    if not t.cancelled() and (exc := t.exception()):
                        logger.error("Recovered RPG session %s raised: %s", mid, exc)

                task.add_done_callback(_rpg_cleanup)
                _running_relays[match_id] = (task, cancel_event, human_event)
                
                logger.info("Recovered RPG session %s: resuming from R.%d, Agent.%d",
                            match_id, rpg_state["current_round"], rpg_state["current_speaker_idx"])
                recovered += 1
                continue

            agent_dicts = recovery.get("agents", [])
            if len(agent_dicts) < 2:
                await db.update_experiment_status(match_id, "failed")
                logger.warning("Session %s has no agent config -- marked failed", match_id)
                continue

            turns_done = session.get("rounds_completed") or 0
            rounds_total = session.get("rounds_planned") or 5
            rounds_remaining = rounds_total - turns_done

            if rounds_remaining <= 0:
                await db.update_experiment_status(match_id, "completed",
                                                  rounds_completed=turns_done)
                continue

            history_rows = await db.get_turns(match_id)
            initial_history = [{"speaker": r["speaker"], "content": r["content"]}
                                for r in history_rows]

            max_tokens = config.get("max_tokens", 1500)
            agents = [
                RelayAgent(
                    name=a.get("name") or get_display_name(a["model"]),
                    model=a["model"],
                    temperature=a.get("temperature", 0.7),
                    max_tokens=max_tokens,
                )
                for a in agent_dicts
            ]

            cancel_event = asyncio.Event()
            resume_event = asyncio.Event()
            resume_event.set()

            task = asyncio.create_task(run_relay(
                match_id=match_id,
                agents=agents,
                seed=session["seed"],
                system_prompt=session["system_prompt"],
                rounds=rounds_remaining,
                start_round=turns_done + 1,
                hub=hub,
                db=db,
                turn_delay_seconds=recovery.get("turn_delay_seconds", 2.0),
                cancel_event=cancel_event,
                resume_event=resume_event,
                preset=recovery.get("preset"),
                enable_scoring=recovery.get("enable_scoring", False),
                enable_verdict=recovery.get("enable_verdict", False),
                enable_memory=recovery.get("enable_memory", False),
                initial_history=initial_history,
                background_tasks=background_tasks,
            ))

            def _cleanup(t: asyncio.Task, mid: str = match_id) -> None:
                _running_relays.pop(mid, None)
                if not t.cancelled() and (exc := t.exception()):
                    logger.error("Recovered session %s raised: %s", mid, exc, exc_info=exc)

            task.add_done_callback(_cleanup)
            _running_relays[match_id] = (task, cancel_event, resume_event)

            logger.info("Recovered session %s: resuming from round %d/%d",
                        match_id, turns_done + 1, rounds_total)
            recovered += 1

        except Exception as e:
            logger.error("Recovery failed for session %s: %s", match_id, e, exc_info=True)
            await db.update_experiment_status(match_id, "failed")

    return recovered
