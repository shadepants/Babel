"""Core relay engine — runs AI-to-AI conversations.

Extracted from Factory/experiments/ai_relay.py with these changes:
- Own RelayAgent dataclass (no Factory dependency)
- Exponential backoff retry on LLM calls
- Publishes SSE events via EventHub instead of printing
- Namespaced RelayEvent constants (no magic strings)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

import litellm

from server.vocab_extractor import extract_vocabulary

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
    SCORE = "relay.score"             # Judge scored a turn (async, fire-and-forget)
    VERDICT = "relay.verdict"         # Judge declared final winner


# ── Task Exception Logging ──────────────────────────────────────────────

def _log_task_exception(task: asyncio.Task) -> None:  # type: ignore[type-arg]
    """Callback for fire-and-forget tasks — surfaces silently swallowed errors."""
    if not task.cancelled() and task.exception():
        logger.error("Background task failed: %s", task.exception())


# ── JSON Parse Helpers ─────────────────────────────────────────────────

def _parse_score_json(raw: str) -> dict:
    """Extract score JSON from LLM response. Returns 0.5 defaults on any failure."""
    defaults = {"creativity": 0.5, "coherence": 0.5, "engagement": 0.5, "novelty": 0.5}
    try:
        m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not m:
            return defaults
        data = json.loads(m.group())
        return {
            key: max(0.0, min(1.0, float(data.get(key, 0.5))))
            for key in ("creativity", "coherence", "engagement", "novelty")
        }
    except Exception:
        return defaults


def _parse_verdict_json(raw: str) -> dict:
    """Extract verdict JSON from LLM response. Returns tie on any failure."""
    defaults = {"winner": "tie", "reasoning": "Unable to determine winner."}
    try:
        m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not m:
            return defaults
        data = json.loads(m.group())
        winner = data.get("winner", "tie")
        if winner not in ("model_a", "model_b", "tie"):
            winner = "tie"
        reasoning = str(data.get("reasoning", ""))[:500]
        return {"winner": winner, "reasoning": reasoning}
    except Exception:
        return defaults


# ── Agent Config ────────────────────────────────────────────────────────

@dataclass
class RelayAgent:
    """Minimal config for one side of the relay. No Factory dependencies."""
    name: str
    model: str           # litellm model string, e.g. "anthropic/claude-sonnet-4-20250514"
    temperature: float = 0.7
    max_tokens: int = 1500
    request_timeout: int = 60


# ── Scoring / Verdict Functions ────────────────────────────────────────

async def score_turn(
    turn_id: int,
    content: str,
    judge_model: str,
    match_id: str,
    hub: "EventHub",
    db: "Database",
) -> None:
    """Score a single turn via the judge model and publish relay.score event.

    Fire-and-forget — relay loop never awaits this directly.
    Logs a warning on failure; never raises.
    """
    prompt = (
        "Score this AI-to-AI conversation turn on 4 dimensions (0.0 to 1.0 each). "
        "Return JSON only, no prose:\n"
        '{"creativity": ..., "coherence": ..., "engagement": ..., "novelty": ...}\n\n'
        f"Turn:\n{content[:2000]}"  # cap to avoid huge prompts
    )
    agent = RelayAgent(
        name="judge",
        model=judge_model,
        temperature=0.2,
        max_tokens=80,
        request_timeout=20,
    )
    try:
        raw, _, _ = await call_model(agent, [{"role": "user", "content": prompt}], max_retries=1)
        scores = _parse_score_json(raw)
        await db.insert_turn_score(turn_id=turn_id, **scores)
        hub.publish(RelayEvent.SCORE, {
            "match_id": match_id,
            "turn_id": turn_id,
            **scores,
        })
    except Exception as exc:
        logger.warning("Scoring failed for turn %d: %s", turn_id, exc)


async def final_verdict(
    match_id: str,
    turns: list[dict],
    agent_a: "RelayAgent",
    agent_b: "RelayAgent",
    judge_model: str,
    hub: "EventHub",
    db: "Database",
) -> None:
    """Ask the judge model to declare a winner and publish relay.verdict event.

    Fire-and-forget — called after MATCH_COMPLETE.
    Logs a warning on failure; never raises.
    """
    lines = []
    for i, t in enumerate(turns):
        speaker_label = agent_a.name if t["speaker"] == "a" else agent_b.name
        lines.append(f"[{speaker_label}]: {t['content'][:500]}")
    transcript = "\n\n".join(lines)

    prompt = (
        f"Read this AI-to-AI conversation. Model A is '{agent_a.name}' ({agent_a.model}), "
        f"model B is '{agent_b.name}' ({agent_b.model}). "
        'Declare a winner and explain why in 1-2 sentences. Return JSON only:\n'
        '{"winner": "model_a" or "model_b" or "tie", "reasoning": "..."}\n\n'
        f"Transcript:\n{transcript[:6000]}"
    )
    agent = RelayAgent(
        name="judge",
        model=judge_model,
        temperature=0.3,
        max_tokens=200,
        request_timeout=30,
    )
    try:
        raw, _, _ = await call_model(agent, [{"role": "user", "content": prompt}], max_retries=1)
        result = _parse_verdict_json(raw)
        hub.publish(RelayEvent.VERDICT, {
            "match_id": match_id,
            "winner_model": agent_a.model if result["winner"] == "model_a" else (
                agent_b.model if result["winner"] == "model_b" else "tie"
            ),
            **result,
        })
        await db.save_verdict(match_id, result["winner"], result["reasoning"])
        logger.info("Verdict saved for %s: %s", match_id, result["winner"])
    except Exception as exc:
        logger.warning("Verdict failed for %s: %s", match_id, exc)


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
            # Some providers return usage as dict, others as object
            usage = response.usage
            if hasattr(usage, "total_tokens"):
                token_count = usage.total_tokens
            elif isinstance(usage, dict):
                token_count = usage.get("total_tokens")
            else:
                token_count = None
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


# ── Vocabulary Extraction Helper ────────────────────────────────────────


async def _extract_and_publish_vocab(
    content: str,
    speaker: str,
    round_num: int,
    match_id: str,
    hub: EventHub,
    db: Database,
    known_words: set[str],
    preset: str | None = None,
) -> None:
    """Extract vocabulary from a turn, persist to DB, and publish SSE events."""
    words = extract_vocabulary(content, known_words, speaker, round_num, preset=preset)
    for word in words:
        await db.upsert_word(
            experiment_id=match_id,
            word=word.word,
            meaning=word.meaning,
            coined_by=speaker,
            coined_round=round_num,
            category=word.category,
            parent_words=word.parent_words or None,
            confidence=word.confidence,
        )
        known_words.add(word.word)

        hub.publish(RelayEvent.VOCAB_UPDATE, {
            "match_id": match_id,
            "word": word.word,
            "meaning": word.meaning,
            "coined_by": speaker,
            "coined_round": round_num,
            "category": word.category,
            "parent_words": word.parent_words,
        })

    if words:
        logger.debug(
            "Extracted %d words from %s round %d: %s",
            len(words), speaker, round_num,
            [w.word for w in words],
        )


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
    turn_delay_seconds: float = 2.0,
    cancel_event: asyncio.Event | None = None,
    preset: str | None = None,
    judge_model: str | None = None,
    enable_scoring: bool = False,
    enable_verdict: bool = False,
    enable_memory: bool = False,
) -> None:
    """Run an AI-to-AI relay conversation.

    Publishes events to the EventHub for SSE streaming and persists
    turns to the database. Runs as a background task — doesn't block
    the API endpoint.
    """
    turns: list[dict] = []
    seed_turn = {"speaker": "b", "content": seed}
    known_words: set[str] = set()  # tracks invented words across rounds
    start_time = time.time()

    try:
        # ── Memory injection ─────────────────────────────────────────────
        if enable_memory:
            memories = await db.get_memories_for_pair(agent_a.model, agent_b.model, limit=5)
            if memories:
                oldest_first = list(reversed(memories))
                lines = [f"Session {i}: {m['summary']}" for i, m in enumerate(oldest_first, 1)]
                memory_block = (
                    "[MEMORY: previous sessions with this partner]\n"
                    + "\n".join(lines)
                    + "\n[END MEMORY]\n\n"
                )
                system_prompt = memory_block + system_prompt
                logger.info(
                    "Injecting %d memories for (%s, %s)",
                    len(memories), agent_a.model, agent_b.model,
                )

        for round_num in range(1, rounds + 1):
            # ── Check cancellation ──
            if cancel_event and cancel_event.is_set():
                elapsed = time.time() - start_time
                await db.update_experiment_status(
                    match_id, "stopped",
                    rounds_completed=round_num - 1,
                    elapsed_seconds=round(elapsed, 1),
                )
                hub.publish(RelayEvent.MATCH_COMPLETE, {
                    "match_id": match_id,
                    "rounds": round_num - 1,
                    "elapsed_s": round(elapsed, 1),
                    "stopped": True,
                })
                logger.info("Relay %s stopped by user after %d rounds", match_id, round_num - 1)
                return

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

            if enable_scoring and judge_model and turn_id_a:
                _score_a = asyncio.create_task(
                    score_turn(turn_id_a, content_a, judge_model, match_id, hub, db)
                )
                _score_a.add_done_callback(_log_task_exception)

            _task_a = asyncio.create_task(_extract_and_publish_vocab(
                content_a, agent_a.name, round_num, match_id, hub, db, known_words,
                preset=preset,
            ))
            _task_a.add_done_callback(_log_task_exception)
            await asyncio.sleep(max(0.0, turn_delay_seconds))  # pause so UI animations are visible

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

            if enable_scoring and judge_model and turn_id_b:
                _score_b = asyncio.create_task(
                    score_turn(turn_id_b, content_b, judge_model, match_id, hub, db)
                )
                _score_b.add_done_callback(_log_task_exception)

            _task_b = asyncio.create_task(_extract_and_publish_vocab(
                content_b, agent_b.name, round_num, match_id, hub, db, known_words,
                preset=preset,
            ))
            _task_b.add_done_callback(_log_task_exception)
            await asyncio.sleep(max(0.0, turn_delay_seconds))  # pause so UI animations are visible

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

        if enable_verdict and judge_model:
            _verdict_task = asyncio.create_task(
                final_verdict(match_id, turns, agent_a, agent_b, judge_model, hub, db)
            )
            _verdict_task.add_done_callback(_log_task_exception)

        if enable_memory:
            async def _save_memory() -> None:
                summary = await db.generate_memory_summary(match_id)
                if summary:
                    await db.create_memory(agent_a.model, agent_b.model, match_id, summary)
                    logger.info("Memory saved for %s: %.80s", match_id, summary)
            _mem_task = asyncio.create_task(_save_memory())
            _mem_task.add_done_callback(_log_task_exception)

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error("Relay %s failed after %.1fs: %s", match_id, elapsed, e)
        await db.update_experiment_status(
            match_id, "failed", elapsed_seconds=round(elapsed, 1),
        )
        hub.publish(RelayEvent.ERROR, {
            "match_id": match_id,
            "message": "Relay failed unexpectedly. Check server logs.",
        })
