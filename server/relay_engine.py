"""Core relay engine -- runs AI-to-AI conversations.

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
import os
import random
import re
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

import litellm

from server.vocab_extractor import extract_vocabulary
from server.summarizer_engine import update_layered_context
from server.chemistry_engine import compute_chemistry
from server.audit_engine import run_audit

if TYPE_CHECKING:
    from server.event_hub import EventHub
    from server.db import Database

logger = logging.getLogger(__name__)

# Suppress litellm's noisy logging
for _name in ("LiteLLM", "litellm", "httpx", "httpcore", "openai", "anthropic"):
    logging.getLogger(_name).setLevel(logging.WARNING)


# -- Provider Fallback Map ----------------------------------------------------
#
# Maps model string (exact or prefix-matched) to a list of backup strategies,
# one per retry attempt. Each entry is (backup_model | None, backup_key_env | None):
#   - backup_model: swap to a different provider/model string on that attempt
#   - backup_key_env: override the API key with a different env var (same model)
#
# Prefix keys end with '/' and are matched via startswith().
# Exact keys take priority over prefix keys.

_FALLBACK_MAP: dict[str, list[tuple[str | None, str | None]]] = {
    # Same-provider key rotation (backup API key, same model)
    "gemini/":     [(None, "GEMINI_API_KEY_BACKUP")],
    "openrouter/": [(None, "OPENROUTER_API_KEY_BACKUP")],
    # Cross-provider fallbacks (same model weights, different inference provider)
    "groq/llama-3.3-70b-versatile":  [("cerebras/llama3.3-70b", None)],
    # Cross-provider fallbacks (equivalent model, different provider)
    "deepseek/deepseek-reasoner": [("sambanova/DeepSeek-R1", None)],
    "deepseek/deepseek-chat":     [("sambanova/deepseek-v3-0324", None)],
}


def _get_fallback(model: str, attempt: int) -> tuple[str, dict]:
    """Return (model_to_use, extra_kwargs) for the given retry attempt.

    attempt=0 returns the primary model with no overrides.
    attempt>0 looks up a backup strategy in _FALLBACK_MAP.
    Falls back gracefully to the original model if no backup is configured.
    """
    if attempt == 0:
        return model, {}

    # Exact match takes priority; then prefix match
    strategies = _FALLBACK_MAP.get(model)
    if strategies is None:
        for prefix, fb_list in _FALLBACK_MAP.items():
            if prefix.endswith("/") and model.startswith(prefix):
                strategies = fb_list
                break

    if not strategies or attempt - 1 >= len(strategies):
        return model, {}  # No backup configured for this attempt number

    backup_model, backup_key_env = strategies[attempt - 1]
    result_model = backup_model or model
    extra: dict = {}
    if backup_key_env:
        key = os.getenv(backup_key_env)
        if key:
            extra["api_key"] = key
    if backup_model:
        logger.info("Failover attempt %d: %s -> %s", attempt, model, backup_model)
    elif backup_key_env:
        logger.info("Failover attempt %d: %s using backup key %s", attempt, model, backup_key_env)
    return result_model, extra


# -- Event Constants ----------------------------------------------------------

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
    ACTION_MENU = "relay.action_menu"         # Contextual action choices for human player
    HUMAN_TIMEOUT = "relay.human_timeout"     # Human player AFK -- no input within timeout
    CHEMISTRY_READY = "relay.chemistry_ready"  # Collaboration metrics computed
    SIGNAL_ECHO = "relay.signal_echo"            # Echo chamber convergence warning
    SIGNAL_INTERVENTION = "relay.signal_intervention"  # Echo intervention injected


# -- Task Exception Logging ---------------------------------------------------

def _log_task_exception(task: asyncio.Task) -> None:  # type: ignore[type-arg]
    """Callback for fire-and-forget tasks -- surfaces silently swallowed errors."""
    if not task.cancelled() and task.exception():
        logger.error("Background task failed: %s", task.exception())


def track_task(task: asyncio.Task, background_tasks: set[asyncio.Task]) -> None:
    """Add task to tracking set and register cleanup callback."""
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    task.add_done_callback(_log_task_exception)


# -- Background Task Concurrency ----------------------------------------------

# Non-retryable litellm errors: config/auth failures that retrying won't fix
_LITELLM_NON_RETRYABLE = (
    litellm.AuthenticationError,
    litellm.NotFoundError,
    litellm.BadRequestError,
)

# Global semaphore: limits concurrent background work (vocab, scoring, summaries)
# across all sessions. Prevents slow provider calls or DB pressure from growing
# unbounded during long multi-session runs.
_BG_SEMAPHORE = asyncio.Semaphore(8)


async def _bg_task(coro) -> None:  # type: ignore[type-arg]
    """Gate a background coroutine through the shared concurrency semaphore."""
    async with _BG_SEMAPHORE:
        await coro


# -- JSON Parse Helpers -------------------------------------------------------

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


# -- Agent Config -------------------------------------------------------------

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


# -- Scoring / Verdict Functions ----------------------------------------------

async def score_turn(
    turn_id: int,
    content: str,
    judge_model: str,
    match_id: str,
    hub: "EventHub",
    db: "Database",
) -> None:
    """Score a single turn via the judge model and publish relay.score event.

    Fire-and-forget -- relay loop never awaits this directly.
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

    Fire-and-forget -- called after MATCH_COMPLETE.
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


async def check_pressure_valve(
    match_id: str,
    turns: list[dict],
    judge_model: str,
) -> str | None:
    """Detect if adversarial models are 'agreeing too much' and return an intervention.

    Returns intervention text if drift is detected, else None.
    """
    if len(turns) < 4:
        return None

    # Focus on the last 4 turns
    transcript = "\n".join([f"[{t['speaker']}]: {t['content'][:300]}" for t in turns[-4:]])
    
    prompt = (
        "You are a narrative stability monitor. Analyze this adversarial AI conversation. "
        "Are the models abandoning their conflicting goals and becoming too cooperative or friendly? "
        "If YES, provide a 1-sentence 'System Intervention' that introduces environmental stress or "
        "forced scarcity to reignite the conflict (e.g., 'The oxygen levels drop; only one can survive'). "
        "If NO, return 'STABLE'.\n\n"
        f"Transcript:\n{transcript}"
    )
    
    agent = RelayAgent(
        name="monitor",
        model=judge_model,
        temperature=0.3,
        max_tokens=100,
        request_timeout=20,
    )
    
    try:
        raw, _, _ = await call_model(agent, [{"role": "user", "content": prompt}], max_retries=1)
        if "STABLE" in raw.upper():
            return None
        return raw.strip()
    except Exception as exc:
        logger.warning("Pressure valve check failed: %s", exc)
        return None


# -- Echo Chamber Detection ---------------------------------------------------

def compute_echo_similarity(
    turns: list[dict],
    known_words: set[str],
    agents: "list[RelayAgent]",
) -> float:
    """Jaccard similarity of vocabulary usage between the first two agents.

    Returns 0.0 if there are fewer than 2 agents or no known words.
    """
    if len(agents) < 2 or not known_words:
        return 0.0

    agent_a_name, agent_b_name = agents[0].name, agents[1].name
    words_a: set[str] = set()
    words_b: set[str] = set()

    for t in turns:
        content_upper = t["content"].upper()
        speaker = t.get("speaker", "")
        used = {w for w in known_words if w.upper() in content_upper}
        if speaker == agent_a_name:
            words_a.update(used)
        elif speaker == agent_b_name:
            words_b.update(used)

    union = words_a | words_b
    if not union:
        return 0.0
    return len(words_a & words_b) / len(union)


# -- LLM Call with Retry ------------------------------------------------------

async def call_model(
    agent: RelayAgent,
    messages: list[dict],
    max_retries: int = 2,
    match_id: str | None = None,
) -> tuple[str, float, int | None]:
    """Call an LLM with full conversation history.

    Returns (content, latency_seconds, token_count).
    Non-retryable errors (4xx auth/config) surface immediately.
    Transient failures retry with exponential backoff + jitter.
    Hard asyncio.wait_for outer timeout guards against provider hangs.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        t0 = time.time()
        try:
            model_to_use, extra = _get_fallback(agent.model, attempt)
            response = await asyncio.wait_for(
                litellm.acompletion(
                    model=model_to_use,
                    messages=messages,
                    max_tokens=agent.max_tokens,
                    temperature=agent.temperature,
                    request_timeout=agent.request_timeout,
                    **extra,
                ),
                timeout=agent.request_timeout + 5,
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
        except _LITELLM_NON_RETRYABLE:
            raise
        except Exception as e:
            last_exc = e
            latency = time.time() - t0
            logger.warning(
                "[%s] Model %s attempt %d/%d failed (%.1fs): %s",
                match_id or "?", agent.model, attempt + 1, max_retries + 1, latency, e,
            )
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt + random.uniform(0, 1))
    raise last_exc  # type: ignore[misc]


# -- History Formatting -------------------------------------------------------

def filter_turns_for_agent(turns: list[dict], agent_name: str) -> list[dict]:
    """Filter turns based on visibility_json.

    A turn is visible if:
    1. visibility_json is empty/null (global)
    2. agent_name is in the visibility list
    3. agent_name is 'DM' (DMs see all)
    """
    filtered = []
    for t in turns:
        v_json = t.get("visibility_json")
        if not v_json or v_json == "[]":
            filtered.append(t)
            continue
        try:
            visible_to = json.loads(v_json)
            if agent_name == "DM" or agent_name in visible_to:
                filtered.append(t)
        except Exception:
            filtered.append(t)  # Fallback to visible if JSON is corrupt
    return filtered


def build_messages(
    system_prompt: str,
    turns: list[dict],
    perspective_idx: int,
    agents: "list[RelayAgent]",
    cold_context: str | None = None,
    world_bible: str | None = None,
    hidden_goals: list[dict] | None = None,
) -> list[dict]:
    """Build OpenAI-format messages from conversation turns for N-way conversations.

    Phase 17: supports layered context (Frozen/Cold/Hot).
    Session 27: hidden_goals injection for adversarial mode.
    """
    # 1. FROZEN CONTEXT
    frozen = system_prompt
    if world_bible:
        frozen = f"{frozen}\n\n[WORLD BIBLE]\n{world_bible}\n[END WORLD BIBLE]"

    # Session 27: Inject hidden agenda into system prompt (only for this agent)
    if hidden_goals:
        for goal in hidden_goals:
            if goal.get("agent_index") == perspective_idx:
                frozen += (
                    f"\n\nSECRET AGENDA (known only to you): {goal['goal']}\n"
                    "Pursue this while appearing to collaborate normally."
                )
                break

    messages = [{"role": "system", "content": frozen}]

    # 2. COLD CONTEXT
    if cold_context:
        messages.append({"role": "user", "content": f"[NARRATIVE RECAP]: {cold_context}"})

    # 3. HOT CONTEXT (Filtered Turns)
    self_name = agents[perspective_idx].name
    filtered_turns = filter_turns_for_agent(turns, self_name)

    for turn in filtered_turns:
        speaker = turn.get("speaker") or ""
        content = turn["content"]
        if speaker == self_name:
            messages.append({"role": "assistant", "content": content})
        elif not speaker:
            # Neutral seed turn -- no attribution prefix
            messages.append({"role": "user", "content": content})
        else:
            # Another agent or human turn -- tag so the model knows who spoke
            messages.append({"role": "user", "content": f"[{speaker}]: {content}"})
    return messages


# -- Vocabulary Extraction Helper ---------------------------------------------


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


# -- Observer / Narrator ------------------------------------------------------

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


# -- Main Relay Loop ----------------------------------------------------------

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
    background_tasks: set[asyncio.Task] | None = None,
    # Backward-compat shim for callers that pass agent_a/agent_b explicitly
    agent_a: RelayAgent | None = None,
    agent_b: RelayAgent | None = None,
    # Recovery: start round numbering here (1 = fresh session; N = resumed after crash)
    start_round: int = 1,
    # Session 27: Echo Chamber Detection
    enable_echo_detector: bool = False,
    enable_echo_intervention: bool = False,
    echo_warn_threshold: float = 0.65,
    echo_intervene_threshold: float = 0.88,
    # Session 27: Recursive Adversarial Mode
    hidden_goals: list[dict] | None = None,
    revelation_round: int | None = None,
    # Session 27: Linguistic Evolution
    vocabulary_seed: list[dict] | None = None,
    # Session 27: Recursive Audit
    enable_audit: bool = False,
) -> None:
    """Run an N-way AI relay conversation (2-4 agents in round-robin order).

    Publishes SSE events to the EventHub and persists turns to the database.
    Runs as a background task -- never blocks the API response.

    Speaker in DB/SSE events is the agent's display name for readability.
    In-memory turns use the same format: {"speaker": name, "content": str}.
    The seed turn uses speaker="" (neutral) so all agents see it as "user" role.

    If initial_history is provided (fork flow), those turns pre-populate the
    conversation context so models continue from a prior experiment.

    start_round > 1 is used by recover_stale_sessions() to resume a crashed session
    at the correct round number so DB round counters stay accurate.
    """
    # Backward-compat: accept old (agent_a, agent_b) call signature
    if agents is None:
        if agent_a is not None and agent_b is not None:
            agents = [agent_a, agent_b]
        else:
            raise ValueError("run_relay requires either 'agents' list or 'agent_a'+'agent_b'")

    assert hub is not None, "hub is required"
    assert db is not None, "db is required"

    # Pre-build speaker-name -> agent index map for pause-refresh
    name_to_idx: dict[str, int] = {a.name: i for i, a in enumerate(agents)}

    # In-memory turns: {"speaker": display_name_or_empty, "content": str}
    turns: list[dict] = list(initial_history) if initial_history else []
    # Neutral seed -- shown to all agents as plain "user" message (no [Name]: prefix)
    seed_turn = {"speaker": "", "content": seed}
    known_words: set[str] = set()
    echo_intervention_fired: bool = False  # Max 1 echo intervention per experiment
    start_time = time.time()

    try:
        # -- Memory injection (2-agent only for now) --------------------------
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

        # Session 27: Vocabulary seed injection (Linguistic Evolution)
        if vocabulary_seed:
            vocab_lines = [f"  {w['word']}: {w['meaning']}" for w in vocabulary_seed]
            seed_block = (
                "VOCABULARY CONSTRAINT: You must use and build upon these existing words:\n"
                + "\n".join(vocab_lines)
                + "\n\n"
            )
            system_prompt = seed_block + system_prompt
            logger.info("Injecting %d seed words for %s", len(vocabulary_seed), match_id)

        # start_round > 1 when recovering a crashed session; rounds = remaining rounds
        for round_num in range(start_round, start_round + rounds):
            # -- Check cancellation --
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

            # -- N-way round-robin: each agent speaks once per round --
            for agent_idx, agent in enumerate(agents):

                # -- Pause checkpoint (before each agent's turn) --
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

                # -- Build message history from this agent's perspective --
                hub.publish(RelayEvent.THINKING, {
                    "match_id": match_id,
                    "speaker": agent.name,
                    "model": agent.model,
                    "round": round_num,
                })

                # Phase 17: Fetch layered context
                cold_context = await db.get_latest_cold_summary(match_id)
                world_bible = await db.get_world_state(match_id)

                if agent.persona:
                    agent_system = (
                        f"You are {agent.persona.name}. {agent.persona.personality}"
                    )
                    if agent.persona.backstory:
                        agent_system += f"\n\nBackground: {agent.persona.backstory}"
                    agent_system += f"\n\n{system_prompt}"
                else:
                    agent_system = system_prompt
                
                # N-way round-robin: only show most recent turns to maintain token efficiency
                hot_turns = turns[-10:] if len(turns) > 10 else turns
                
                messages = build_messages(
                    agent_system, [seed_turn] + hot_turns, agent_idx, agents,
                    cold_context=cold_context,
                    world_bible=world_bible,
                    hidden_goals=hidden_goals,
                )
                content, latency, tokens = await call_model(agent, messages, match_id=match_id)

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
                        _bg_task(score_turn(turn_id, content, judge_model, match_id, hub, db))
                    )
                    if background_tasks is not None:
                        track_task(_score_task, background_tasks)
                    else:
                        _score_task.add_done_callback(_log_task_exception)

                _vocab_task = asyncio.create_task(_bg_task(_extract_and_publish_vocab(
                    content, agent.name, round_num, match_id, hub, db, known_words,
                    preset=preset,
                )))
                if background_tasks is not None:
                    track_task(_vocab_task, background_tasks)
                else:
                    _vocab_task.add_done_callback(_log_task_exception)

                # Session 27: Echo Chamber Detection (after each round completes)
                if enable_echo_detector and agent_idx == len(agents) - 1 and known_words:
                    similarity = compute_echo_similarity(turns, known_words, agents)
                    if similarity >= echo_warn_threshold:
                        hub.publish(RelayEvent.SIGNAL_ECHO, {
                            "match_id": match_id,
                            "similarity": round(similarity, 3),
                            "round": round_num,
                        })
                        logger.info("Echo detected for %s: similarity=%.3f", match_id, similarity)
                    if (
                        enable_echo_intervention
                        and not echo_intervention_fired
                        and similarity >= echo_intervene_threshold
                    ):
                        echo_intervention_fired = True
                        nudge = (
                            "A third voice interrupts: Abandon your shared vocabulary. "
                            "Introduce 3 concepts your partner has never used. Surprise them."
                        )
                        turns.append({"speaker": "", "content": f"[SYSTEM INTERVENTION]: {nudge}"})
                        await db.add_turn(
                            experiment_id=match_id,
                            round_num=round_num,
                            speaker="System",
                            model="echo_monitor",
                            content=nudge,
                        )
                        hub.publish(RelayEvent.SIGNAL_INTERVENTION, {
                            "match_id": match_id,
                            "round": round_num,
                            "similarity": round(similarity, 3),
                        })
                        logger.info("Echo intervention injected for %s at round %d", match_id, round_num)

                # Phase 17: Update layered context asynchronously every 2 rounds
                if round_num % 2 == 0 and agent_idx == len(agents) - 1:
                    _summarize_task = asyncio.create_task(_bg_task(update_layered_context(match_id, db)))
                    if background_tasks is not None:
                        track_task(_summarize_task, background_tasks)
                    else:
                        _summarize_task.add_done_callback(_log_task_exception)

                # Phase 17: Zero-Sum Pressure Valve (E3)
                # Check for cooperative drift every 3 rounds in adversarial presets
                if judge_model and round_num % 3 == 0 and agent_idx == len(agents) - 1:
                    # We assume 'adversarial' is in the preset tags or name
                    if preset and any(x in preset.lower() for x in ("debate", "conflict", "dilemma", "adversarial")):
                        intervention = await check_pressure_valve(match_id, turns, judge_model)
                        if intervention:
                            logger.info("Pressure valve TRIGGERED for %s: %s", match_id, intervention)
                            # Inject as a neutral System turn
                            turns.append({"speaker": "", "content": f"[SYSTEM INTERVENTION]: {intervention}"})
                            await db.add_turn(
                                experiment_id=match_id,
                                round_num=round_num,
                                speaker="System",
                                model="monitor",
                                content=intervention
                            )
                            hub.publish(RelayEvent.TURN, {
                                "match_id": match_id,
                                "round": round_num,
                                "speaker": "System",
                                "model": "monitor",
                                "content": f"// INTERVENTION: {intervention}",
                                "latency_s": 0,
                                "turn_id": 0
                            })

                await asyncio.sleep(max(0.0, turn_delay_seconds))

                # -- Observer after each turn --
                if observer_model and len(turns) % observer_interval == 0:
                    _obs = asyncio.create_task(
                        _observe(turns.copy(), observer_model, match_id, hub)
                    )
                    track_task(_obs, background_tasks)

            # -- Round complete --
            hub.publish(RelayEvent.ROUND_COMPLETE, {
                "match_id": match_id,
                "round": round_num,
                "rounds_total": start_round + rounds - 1,
            })
            await db.update_experiment_status(
                match_id, "running", rounds_completed=round_num,
            )

            # Session 27: Mid-experiment agenda revelation
            if hidden_goals and revelation_round and round_num == revelation_round:
                hub.publish("relay.agenda_revealed", {
                    "match_id": match_id,
                    "hidden_goals": hidden_goals,
                    "round": round_num,
                })
                logger.info("Mid-experiment agenda reveal for %s at round %d", match_id, round_num)

        # -- All rounds done --
        elapsed = time.time() - start_time
        await db.update_experiment_status(
            match_id, "completed",
            rounds_completed=round_num,
            elapsed_seconds=round(elapsed, 1),
        )
        hub.publish(RelayEvent.MATCH_COMPLETE, {
            "match_id": match_id,
            "rounds": round_num,
            "elapsed_s": round(elapsed, 1),
        })
        logger.info("Relay %s completed: %d rounds in %.1fs", match_id, round_num, elapsed)

        if enable_verdict and judge_model:
            _verdict_task = asyncio.create_task(
                _bg_task(final_verdict(match_id, turns, agents, judge_model, hub, db))
            )
            if background_tasks is not None:
                track_task(_verdict_task, background_tasks)
            else:
                _verdict_task.add_done_callback(_log_task_exception)

        if enable_memory and len(agents) == 2:
            async def _save_memory() -> None:
                summary = await db.generate_memory_summary(match_id)
                if summary:
                    await db.create_memory(agents[0].model, agents[1].model, match_id, summary)
                    logger.info("Memory saved for %s: %.80s", match_id, summary)
            _mem_task = asyncio.create_task(_bg_task(_save_memory()))
            if background_tasks is not None:
                track_task(_mem_task, background_tasks)
            else:
                _mem_task.add_done_callback(_log_task_exception)

        # Session 27: Collaboration Chemistry (fire-and-forget)
        _chem_task = asyncio.create_task(
            _bg_task(compute_chemistry(match_id, db, hub))
        )
        if background_tasks is not None:
            track_task(_chem_task, background_tasks)
        else:
            _chem_task.add_done_callback(_log_task_exception)

        if parent_experiment_id:
            _origin_task = asyncio.create_task(
                db.tag_word_origins(match_id, parent_experiment_id)
            )
            _origin_task.add_done_callback(_log_task_exception)

        # Session 27: Adversarial agenda revelation at experiment end
        if hidden_goals:
            hub.publish("relay.agenda_revealed", {
                "match_id": match_id,
                "hidden_goals": hidden_goals,
            })
            logger.info("Agendas revealed for %s: %d goals", match_id, len(hidden_goals))

        # Session 27: Recursive Audit (fire-and-forget)
        if enable_audit:
            _audit_task = asyncio.create_task(
                _bg_task(run_audit(match_id, db, hub, background_tasks))
            )
            if background_tasks is not None:
                track_task(_audit_task, background_tasks)
            else:
                _audit_task.add_done_callback(_log_task_exception)

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
