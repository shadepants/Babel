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
    PAUSED = "relay.paused"           # Relay yielded at pause checkpoint
    RESUMED = "relay.resumed"         # Relay continuing after pause
    OBSERVER = "relay.observer"       # Observer/narrator model commentary
    AWAITING_HUMAN = "relay.awaiting_human"  # RPG engine waiting for human input


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


def _parse_verdict_json(raw: str, n_agents: int = 2) -> dict:
    """Extract verdict JSON from LLM response. Returns tie on any failure.

    Valid winners: "agent_0", "agent_1", ..., "agent_{n-1}", "tie".
    """
    defaults = {"winner": "tie", "reasoning": "Unable to determine winner."}
    valid_winners = {f"agent_{i}" for i in range(n_agents)} | {"tie"}
    try:
        m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not m:
            return defaults
        data = json.loads(m.group())
        winner = data.get("winner", "tie")
        if winner not in valid_winners:
            winner = "tie"
        reasoning = str(data.get("reasoning", ""))[:500]
        return {"winner": winner, "reasoning": reasoning}
    except Exception:
        return defaults


# ── Agent Config ────────────────────────────────────────────────────────

@dataclass
class PersonaRecord:
    """Personality profile injected into an agent's system prompt."""
    id: str
    name: str
    personality: str
    backstory: str


@dataclass
class RelayAgent:
    """Minimal config for one side of the relay. No Factory dependencies."""
    name: str
    model: str           # litellm model string, e.g. "anthropic/claude-sonnet-4-20250514"
    temperature: float = 0.7
    max_tokens: int = 1500
    request_timeout: int = 60
    persona: PersonaRecord | None = None


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
    agents: "list[RelayAgent]",
    judge_model: str,
    hub: "EventHub",
    db: "Database",
) -> None:
    """Ask the judge model to declare a winner and publish relay.verdict event.

    Fire-and-forget — called after MATCH_COMPLETE.
    Accepts a list of agents (2-4). Logs a warning on failure; never raises.
    """
    lines = []
    for t in turns:
        lines.append(f"[{t['speaker']}]: {t['content'][:500]}")
    transcript = "\n\n".join(lines)

    agent_descriptions = "; ".join(
        f"agent_{i} = '{a.name}' ({a.model})" for i, a in enumerate(agents)
    )
    valid_winners = " or ".join(f'"agent_{i}"' for i in range(len(agents))) + ' or "tie"'
    prompt = (
        f"Read this AI-to-AI conversation. Agents: {agent_descriptions}. "
        f"Declare a winner and explain why in 1-2 sentences. Return JSON only:\n"
        f'{{"winner": {valid_winners}, "reasoning": "..."}}\n\n'
        f"Transcript:\n{transcript[:6000]}"
    )
    judge_agent = RelayAgent(
        name="judge",
        model=judge_model,
        temperature=0.3,
        max_tokens=200,
        request_timeout=30,
    )
    try:
        raw, _, _ = await call_model(judge_agent, [{"role": "user", "content": prompt}], max_retries=1)
        result = _parse_verdict_json(raw, n_agents=len(agents))
        # Resolve winner agent model string for the event
        winner_model = "tie"
        if result["winner"] != "tie":
            idx = int(result["winner"].split("_")[1])
            winner_model = agents[idx].model if idx < len(agents) else "tie"
        hub.publish(RelayEvent.VERDICT, {
            "match_id": match_id,
            "winner_model": winner_model,
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
    perspective_idx: int,
    agents: "list[RelayAgent]",
) -> list[dict]:
    """Build OpenAI-format messages from conversation turns for N-way conversations.

    Each turn has {"speaker": str, "content": str} where speaker is the agent's
    display name (or "" for the neutral seed turn).

    - Self-turns (speaker == agents[perspective_idx].name): "assistant" role, no prefix.
    - Seed/neutral turns (speaker == "" or None): "user" role, no prefix.
    - Other-agent or human turns: "user" role, prefixed "[SpeakerName]: ".
    """
    messages = [{"role": "system", "content": system_prompt}]
    self_name = agents[perspective_idx].name
    for turn in turns:
        speaker = turn.get("speaker") or ""
        content = turn["content"]
        if speaker == self_name:
            messages.append({"role": "assistant", "content": content})
        elif not speaker:
            # Neutral seed turn — no attribution prefix
            messages.append({"role": "user", "content": content})
        else:
            # Another agent or human turn — tag so the model knows who spoke
            messages.append({"role": "user", "content": f"[{speaker}]: {content}"})
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


# ── Observer / Narrator ─────────────────────────────────────────────────

async def _observe(
    turns: list[dict],
    observer_model: str,
    match_id: str,
    hub: "EventHub",
) -> None:
    """Call the observer model with the current transcript and publish commentary."""
    transcript = "\n\n".join(
        f"[{t.get('speaker') or 'System'}]: {t['content'][:300]}"
        for t in turns[-20:]
    )
    prompt = (
        "You are a neutral observer watching an AI conversation unfold. "
        "In 1-2 sentences, describe what you notice about the dynamics, "
        "themes, or patterns emerging. Be concise and specific.\n\n"
        f"Conversation so far:\n{transcript}"
    )
    agent = RelayAgent(
        name="Observer",
        model=observer_model,
        temperature=0.5,
        max_tokens=150,
        request_timeout=30,
    )
    try:
        content, _, _ = await call_model(agent, [{"role": "user", "content": prompt}], max_retries=1)
        hub.publish(RelayEvent.OBSERVER, {
            "match_id": match_id,
            "speaker": "Observer",
            "model": observer_model,
            "content": content.strip(),
            "after_turn": len(turns),
        })
    except Exception as exc:
        logger.warning("Observer call failed for %s: %s", match_id, exc)


# ── Main Relay Loop ─────────────────────────────────────────────────────

async def run_relay(
    match_id: str,
    agents: list[RelayAgent] | None = None,
    seed: str = "",
    system_prompt: str = "",
    rounds: int = 5,
    hub: EventHub | None = None,
    db: Database | None = None,
    turn_delay_seconds: float = 2.0,
    cancel_event: asyncio.Event | None = None,
    resume_event: asyncio.Event | None = None,
    observer_model: str | None = None,
    observer_interval: int = 3,
    preset: str | None = None,
    judge_model: str | None = None,
    enable_scoring: bool = False,
    enable_verdict: bool = False,
    enable_memory: bool = False,
    initial_history: list[dict] | None = None,
    parent_experiment_id: str | None = None,
    # Backward-compat shim for callers that pass agent_a/agent_b explicitly
    agent_a: RelayAgent | None = None,
    agent_b: RelayAgent | None = None,
) -> None:
    """Run an N-way AI relay conversation (2-4 agents in round-robin order).

    Publishes SSE events to the EventHub and persists turns to the database.
    Runs as a background task — never blocks the API response.

    Speaker in DB/SSE events is the agent's display name for readability.
    In-memory turns use the same format: {"speaker": name, "content": str}.
    The seed turn uses speaker="" (neutral) so all agents see it as "user" role.

    If initial_history is provided (fork flow), those turns pre-populate the
    conversation context so models continue from a prior experiment.
    """
    # Backward-compat: accept old (agent_a, agent_b) call signature
    if agents is None:
        if agent_a is not None and agent_b is not None:
            agents = [agent_a, agent_b]
        else:
            raise ValueError("run_relay requires either 'agents' list or 'agent_a'+'agent_b'")

    assert hub is not None, "hub is required"
    assert db is not None, "db is required"

    # Pre-build speaker-name → agent index map for pause-refresh
    name_to_idx: dict[str, int] = {a.name: i for i, a in enumerate(agents)}

    # In-memory turns: {"speaker": display_name_or_empty, "content": str}
    turns: list[dict] = list(initial_history) if initial_history else []
    # Neutral seed — shown to all agents as plain "user" message (no [Name]: prefix)
    seed_turn = {"speaker": "", "content": seed}
    known_words: set[str] = set()
    start_time = time.time()

    try:
        # ── Memory injection (2-agent only for now) ──────────────────────
        if enable_memory and len(agents) == 2:
            memories = await db.get_memories_for_pair(agents[0].model, agents[1].model, limit=5)
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
                    len(memories), agents[0].model, agents[1].model,
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

            # ── N-way round-robin: each agent speaks once per round ──
            for agent_idx, agent in enumerate(agents):

                # ── Pause checkpoint (before each agent's turn) ──
                if resume_event and not resume_event.is_set():
                    hub.publish(RelayEvent.PAUSED, {"match_id": match_id, "round": round_num})
                    await resume_event.wait()
                    # Refresh history from DB to pick up any injected human turns
                    fresh = await db.get_turns(match_id)
                    turns[:] = [
                        {"speaker": t["speaker"], "content": t["content"]}
                        for t in fresh
                    ]
                    hub.publish(RelayEvent.RESUMED, {"match_id": match_id, "round": round_num})

                # ── Build message history from this agent's perspective ──
                hub.publish(RelayEvent.THINKING, {
                    "match_id": match_id,
                    "speaker": agent.name,
                    "model": agent.model,
                    "round": round_num,
                })

                if agent.persona:
                    agent_system = (
                        f"You are {agent.persona.name}. {agent.persona.personality}"
                    )
                    if agent.persona.backstory:
                        agent_system += f"\n\nBackground: {agent.persona.backstory}"
                    agent_system += f"\n\n{system_prompt}"
                else:
                    agent_system = system_prompt
                messages = build_messages(
                    agent_system, [seed_turn] + turns, agent_idx, agents
                )
                content, latency, tokens = await call_model(agent, messages)

                turns.append({"speaker": agent.name, "content": content})
                turn_id = await db.add_turn(
                    experiment_id=match_id,
                    round_num=round_num,
                    speaker=agent.name,
                    model=agent.model,
                    content=content,
                    latency_seconds=latency,
                    token_count=tokens,
                )

                hub.publish(RelayEvent.TURN, {
                    "match_id": match_id,
                    "round": round_num,
                    "speaker": agent.name,
                    "model": agent.model,
                    "content": content,
                    "latency_s": round(latency, 1),
                    "turn_id": turn_id,
                })

                if enable_scoring and judge_model and turn_id:
                    _score_task = asyncio.create_task(
                        score_turn(turn_id, content, judge_model, match_id, hub, db)
                    )
                    _score_task.add_done_callback(_log_task_exception)

                _vocab_task = asyncio.create_task(_extract_and_publish_vocab(
                    content, agent.name, round_num, match_id, hub, db, known_words,
                    preset=preset,
                ))
                _vocab_task.add_done_callback(_log_task_exception)
                await asyncio.sleep(max(0.0, turn_delay_seconds))

                # ── Observer after each turn ──
                if observer_model and len(turns) % observer_interval == 0:
                    _obs = asyncio.create_task(
                        _observe(turns.copy(), observer_model, match_id, hub)
                    )
                    _obs.add_done_callback(_log_task_exception)

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
                final_verdict(match_id, turns, agents, judge_model, hub, db)
            )
            _verdict_task.add_done_callback(_log_task_exception)

        if enable_memory and len(agents) == 2:
            async def _save_memory() -> None:
                summary = await db.generate_memory_summary(match_id)
                if summary:
                    await db.create_memory(agents[0].model, agents[1].model, match_id, summary)
                    logger.info("Memory saved for %s: %.80s", match_id, summary)
            _mem_task = asyncio.create_task(_save_memory())
            _mem_task.add_done_callback(_log_task_exception)

        if parent_experiment_id:
            _origin_task = asyncio.create_task(
                db.tag_word_origins(match_id, parent_experiment_id)
            )
            _origin_task.add_done_callback(_log_task_exception)

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
