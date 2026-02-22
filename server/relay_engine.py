"""Core relay engine — runs AI-to-AI conversations.

Extracted from Factory/experiments/ai_relay.py with these changes:
- Own RelayAgent dataclass (no Factory dependency)
- Exponential backoff retry on LLM calls
- Publishes SSE events via EventHub instead of printing
- Namespaced RelayEvent constants (no magic strings)
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

import litellm

if TYPE_CHECKING:
    from server.event_hub import EventHub
    from server.db import Database

logger = logging.getLogger(__name__)

# Suppress litellm's noisy logging
for _name in ("LiteLLM", "litellm", "httpx", "httpcore", "openai", "anthropic"):
    logging.getLogger(_name).setLevel(logging.WARNING)


# ── Event Constants ─────────────────────────────────────────────────────

class RelayEvent:
    """Namespaced SSE event types for the relay engine."""
    THINKING = "relay.thinking"       # Model is generating a response
    TURN = "relay.turn"               # A model's response is ready
    VOCAB_UPDATE = "relay.vocab"      # New vocabulary extracted
    ROUND_COMPLETE = "relay.round"    # Both models finished a round
    MATCH_COMPLETE = "relay.done"     # All rounds finished
    ERROR = "relay.error"             # Something went wrong


# ── Agent Config ────────────────────────────────────────────────────────

@dataclass
class RelayAgent:
    """Minimal config for one side of the relay. No Factory dependencies."""
    name: str
    model: str           # litellm model string, e.g. "anthropic/claude-sonnet-4-20250514"
    temperature: float = 0.7
    max_tokens: int = 1500
    request_timeout: int = 60


# ── LLM Call with Retry ─────────────────────────────────────────────────

async def call_model(
    agent: RelayAgent,
    messages: list[dict],
    max_retries: int = 2,
) -> tuple[str, float, int | None]:
    """Call an LLM with full conversation history.

    Returns (content, latency_seconds, token_count).
    Retries transient failures with exponential backoff.
    Guards against null content (safety filters / empty completions).
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        t0 = time.time()
        try:
            response = await litellm.acompletion(
                model=agent.model,
                messages=messages,
                max_tokens=agent.max_tokens,
                temperature=agent.temperature,
                request_timeout=agent.request_timeout,
            )
            latency = time.time() - t0
            content = response.choices[0].message.content or "[NO OUTPUT]"
            token_count = getattr(response.usage, "total_tokens", None)
            return content, latency, token_count
        except Exception as e:
            last_exc = e
            latency = time.time() - t0
            logger.warning(
                "Model %s attempt %d/%d failed (%.1fs): %s",
                agent.model, attempt + 1, max_retries + 1, latency, e,
            )
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)
    raise last_exc  # type: ignore[misc]


# ── History Formatting ──────────────────────────────────────────────────

def build_messages(
    system_prompt: str,
    turns: list[dict],
    perspective: str,
) -> list[dict]:
    """Build OpenAI-format messages from conversation turns.

    Each turn has {"speaker": "a"|"b", "content": str}.
    The perspective agent's turns become "assistant" role,
    the other agent's become "user" role.
    """
    messages = [{"role": "system", "content": system_prompt}]
    for turn in turns:
        if turn["speaker"] == perspective:
            messages.append({"role": "assistant", "content": turn["content"]})
        else:
            messages.append({"role": "user", "content": turn["content"]})
    return messages


# ── Main Relay Loop ─────────────────────────────────────────────────────

async def run_relay(
    match_id: str,
    agent_a: RelayAgent,
    agent_b: RelayAgent,
    seed: str,
    system_prompt: str,
    rounds: int,
    hub: EventHub,
    db: Database,
) -> None:
    """Run an AI-to-AI relay conversation.

    Publishes events to the EventHub for SSE streaming and persists
    turns to the database. Runs as a background task — doesn't block
    the API endpoint.
    """
    turns: list[dict] = []
    seed_turn = {"speaker": "b", "content": seed}
    start_time = time.time()

    try:
        for round_num in range(1, rounds + 1):
            # ── Agent A's turn ──
            hub.publish(RelayEvent.THINKING, {
                "match_id": match_id,
                "speaker": agent_a.name,
                "model": agent_a.model,
                "round": round_num,
            })

            messages_a = build_messages(system_prompt, [seed_turn] + turns, "a")
            content_a, latency_a, tokens_a = await call_model(agent_a, messages_a)

            turns.append({"speaker": "a", "content": content_a})
            turn_id_a = await db.add_turn(
                experiment_id=match_id,
                round_num=round_num,
                speaker=agent_a.name,
                model=agent_a.model,
                content=content_a,
                latency_seconds=latency_a,
                token_count=tokens_a,
            )

            hub.publish(RelayEvent.TURN, {
                "match_id": match_id,
                "round": round_num,
                "speaker": agent_a.name,
                "model": agent_a.model,
                "content": content_a,
                "latency_s": round(latency_a, 1),
                "turn_id": turn_id_a,
            })

            # ── Agent B's turn ──
            hub.publish(RelayEvent.THINKING, {
                "match_id": match_id,
                "speaker": agent_b.name,
                "model": agent_b.model,
                "round": round_num,
            })

            messages_b = build_messages(system_prompt, [seed_turn] + turns, "b")
            content_b, latency_b, tokens_b = await call_model(agent_b, messages_b)

            turns.append({"speaker": "b", "content": content_b})
            turn_id_b = await db.add_turn(
                experiment_id=match_id,
                round_num=round_num,
                speaker=agent_b.name,
                model=agent_b.model,
                content=content_b,
                latency_seconds=latency_b,
                token_count=tokens_b,
            )

            hub.publish(RelayEvent.TURN, {
                "match_id": match_id,
                "round": round_num,
                "speaker": agent_b.name,
                "model": agent_b.model,
                "content": content_b,
                "latency_s": round(latency_b, 1),
                "turn_id": turn_id_b,
            })

            # ── Round complete ──
            hub.publish(RelayEvent.ROUND_COMPLETE, {
                "match_id": match_id,
                "round": round_num,
                "rounds_total": rounds,
            })

            await db.update_experiment_status(
                match_id, "running", rounds_completed=round_num,
            )

        # ── All rounds done ──
        elapsed = time.time() - start_time
        await db.update_experiment_status(
            match_id, "completed",
            rounds_completed=rounds,
            elapsed_seconds=round(elapsed, 1),
        )
        hub.publish(RelayEvent.MATCH_COMPLETE, {
            "match_id": match_id,
            "rounds": rounds,
            "elapsed_s": round(elapsed, 1),
        })
        logger.info("Relay %s completed: %d rounds in %.1fs", match_id, rounds, elapsed)

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error("Relay %s failed after %.1fs: %s", match_id, elapsed, e)
        await db.update_experiment_status(
            match_id, "failed", elapsed_seconds=round(elapsed, 1),
        )
        hub.publish(RelayEvent.ERROR, {
            "match_id": match_id,
            "message": str(e),
        })
