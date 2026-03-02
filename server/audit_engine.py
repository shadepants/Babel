"""Recursive Audit Engine -- auto-launches an audit experiment for a completed experiment.

The audit IS a Babel experiment (mode='audit') that's stored, viewable, forkable,
and itself auditable. Two analyst models discuss the original transcript.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from server.db import Database
    from server.event_hub import EventHub

logger = logging.getLogger(__name__)

# Fallback analyst models if source experiment models are unavailable
DEFAULT_AUDIT_MODELS = [
    "anthropic/claude-haiku-4-5-20251001",
    "openai/gpt-4.1-mini",
]
AUDIT_ROUNDS = 3


async def run_audit(
    source_experiment_id: str,
    db: "Database",
    hub: "EventHub",
    background_tasks: set | None = None,
) -> str | None:
    """Launch an audit experiment analyzing a completed experiment's transcript.

    Uses the source experiment's own models as analysts so the audit works
    regardless of which providers are configured. Falls back to DEFAULT_AUDIT_MODELS
    if the source models aren't in the registry.

    Returns the audit experiment's match_id, or None on failure.
    """
    try:
        # Fetch source experiment data
        source = await db.get_experiment(source_experiment_id)
        if source is None:
            logger.warning("Audit: source experiment %s not found", source_experiment_id)
            return None

        turns = await db.get_turns(source_experiment_id)
        if not turns:
            logger.warning("Audit: no turns for %s", source_experiment_id)
            return None

        # Build audit transcript
        transcript_lines = []
        for t in turns:
            speaker = t.get("speaker", "Unknown")
            content = t["content"][:500]
            transcript_lines.append(f"[{speaker}]: {content}")
        transcript = "\n\n".join(transcript_lines[:40])  # Cap at 40 turns

        # Build audit seed
        seed = (
            "The following is a transcript from an AI-to-AI conversation experiment. "
            "Analyze the collaboration quality, vocabulary evolution, emergent patterns, "
            "and any notable dynamics between the participants.\n\n"
            f"SOURCE EXPERIMENT: {source_experiment_id}\n"
            f"PRESET: {source.get('preset', 'unknown')}\n"
            f"ROUNDS: {source.get('rounds_completed', '?')}\n\n"
            f"TRANSCRIPT:\n{transcript}"
        )

        system_prompt = (
            "You are a collaboration analyst reviewing an AI conversation. "
            "Discuss the transcript with your partner. Identify patterns, "
            "assess vocabulary innovation, evaluate collaboration dynamics, "
            "and produce insights about the conversation's evolution. "
            "Be specific and cite examples from the transcript."
        )

        # Use the source experiment's models as analysts so the audit always
        # works with the same providers the user already has configured.
        from server.config import MODEL_REGISTRY
        _allowed = frozenset(MODEL_REGISTRY.values())

        src_model_a = source.get("model_a") or DEFAULT_AUDIT_MODELS[0]
        src_model_b = source.get("model_b") or DEFAULT_AUDIT_MODELS[1]
        audit_model_a = src_model_a if src_model_a in _allowed else DEFAULT_AUDIT_MODELS[0]
        audit_model_b = src_model_b if src_model_b in _allowed else DEFAULT_AUDIT_MODELS[1]

        # Import relay internals here to avoid circular imports at module load time
        from server.relay_engine import (
            RelayAgent, run_relay, _bg_task, track_task, _log_task_exception
        )

        audit_match_id = str(uuid.uuid4())

        agents = [
            RelayAgent(
                name="Analyst-A",
                model=audit_model_a,
                temperature=0.6,
                max_tokens=1200,
            ),
            RelayAgent(
                name="Analyst-B",
                model=audit_model_b,
                temperature=0.6,
                max_tokens=1200,
            ),
        ]

        # Create the audit experiment record
        now = datetime.now(timezone.utc).isoformat()
        await db._execute_queued(
            """INSERT INTO experiments
                (id, created_at, model_a, model_b, preset, seed, system_prompt,
                 rounds_planned, status, mode, parent_experiment_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', 'audit', ?)""",
            (audit_match_id, now, audit_model_a, audit_model_b,
             "audit", seed[:500], system_prompt, AUDIT_ROUNDS, source_experiment_id),
        )

        # Update source experiment with back-reference
        await db._execute_queued(
            "UPDATE experiments SET audit_experiment_id = ? WHERE id = ?",
            (audit_match_id, source_experiment_id),
        )

        # Use the same judge model as the main relay default
        from server.config import JUDGE_MODEL

        # Fire the relay
        _audit_task = asyncio.create_task(
            _bg_task(run_relay(
                match_id=audit_match_id,
                agents=agents,
                seed=seed,
                system_prompt=system_prompt,
                rounds=AUDIT_ROUNDS,
                hub=hub,
                db=db,
                turn_delay_seconds=1.0,
                preset="audit",
                enable_verdict=True,
                judge_model=JUDGE_MODEL,
                parent_experiment_id=source_experiment_id,
                background_tasks=background_tasks,
            ))
        )
        if background_tasks is not None:
            track_task(_audit_task, background_tasks)
        else:
            _audit_task.add_done_callback(_log_task_exception)

        hub.publish("relay.audit_started", {
            "match_id": source_experiment_id,
            "audit_experiment_id": audit_match_id,
        })
        logger.info("Audit experiment %s launched for source %s (analysts: %s / %s)",
                    audit_match_id, source_experiment_id, audit_model_a, audit_model_b)
        return audit_match_id

    except Exception as exc:
        logger.error("Audit launch failed for %s: %s", source_experiment_id, exc)
        return None
