"""RPG Engine -- runs asymmetric, multi-agent campaigns with human yielding.

This is a sibling to relay_engine.py. Standard relay uses symmetric A/B turns;
RPG engine uses a participant list where any actor can be human or AI.
When it's a human's turn, the engine publishes an awaiting_human event and
blocks on an asyncio.Event until POST /inject signals the event.

Phase 13b: Virtual Tabletop expansion.
"""

import asyncio
import json
import logging
import time
from typing import Any

from server.db import Database
from server.event_hub import EventHub
from server.relay_engine import (
    RelayAgent,
    RelayEvent,
    call_model,
    _log_task_exception,
)

logger = logging.getLogger(__name__)


async def run_rpg_match(
    match_id: str,
    participants: list[dict],
    seed: str,
    system_prompt: str,
    rounds: int,
    hub: EventHub,
    db: Database,
    human_event: asyncio.Event,
    cancel_event: asyncio.Event | None = None,
) -> None:
    """Run an RPG session with human-in-the-loop yielding.

    Args:
        match_id: Experiment ID for this match.
        participants: List of dicts with keys: name, model, role.
                     model="human" means human player (waits for inject).
        seed: Opening narrative / scenario seed.
        system_prompt: System prompt for AI participants.
        rounds: Number of full rounds (each participant speaks once per round).
        hub: EventHub for SSE publishing.
        db: Database instance.
        human_event: asyncio.Event that POST /inject will set() to resume.
        cancel_event: Optional event to signal early stop.
    """
    turns: list[dict] = []
    start_time = time.time()

    try:
        for round_num in range(1, rounds + 1):
            # Check for cancellation at round boundary
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
                logger.info("RPG %s stopped by user after %d rounds", match_id, round_num - 1)
                return

            for actor in participants:
                # -- Human turn: yield and wait for inject --
                if actor["model"] == "human":
                    hub.publish(RelayEvent.AWAITING_HUMAN, {
                        "match_id": match_id,
                        "speaker": actor["name"],
                        "round": round_num,
                    })

                    # Block until POST /inject calls human_event.set()
                    await human_event.wait()
                    human_event.clear()

                    # Check for cancellation after human input
                    if cancel_event and cancel_event.is_set():
                        break

                    # Fetch the injected turn from DB to maintain context
                    db_turns = await db.get_turns(match_id)
                    if db_turns:
                        latest = db_turns[-1]
                        turns.append({
                            "speaker": actor["name"],
                            "content": latest["content"],
                        })
                    continue

                # -- AI turn: build messages and call model --
                hub.publish(RelayEvent.THINKING, {
                    "match_id": match_id,
                    "speaker": actor["name"],
                    "model": actor["model"],
                    "round": round_num,
                })

                agent = RelayAgent(
                    name=actor["name"],
                    model=actor["model"],
                    temperature=actor.get("temperature", 0.7),
                    max_tokens=actor.get("max_tokens", 1500),
                )

                # RPG uses global perspective: all participants see the full log.
                # This differs from standard relay which uses symmetric A/B views.
                messages: list[dict] = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": seed},
                ]
                for t in turns:
                    if t["speaker"] == actor["name"]:
                        messages.append({"role": "assistant", "content": t["content"]})
                    else:
                        messages.append({
                            "role": "user",
                            "content": f"[{t['speaker']}]: {t['content']}",
                        })

                content, latency, tokens = await call_model(agent, messages)
                turns.append({"speaker": actor["name"], "content": content})

                turn_id = await db.add_turn(
                    experiment_id=match_id,
                    round_num=round_num,
                    speaker=actor["name"],
                    model=actor["model"],
                    content=content,
                    latency_seconds=latency,
                    token_count=tokens,
                )

                hub.publish(RelayEvent.TURN, {
                    "match_id": match_id,
                    "round": round_num,
                    "speaker": actor["name"],
                    "model": actor["model"],
                    "content": content,
                    "latency_s": round(latency, 1),
                    "turn_id": turn_id,
                })

            # Round complete
            hub.publish(RelayEvent.ROUND_COMPLETE, {
                "match_id": match_id,
                "round": round_num,
                "rounds_total": rounds,
            })
            await db.update_experiment_status(
                match_id, "running", rounds_completed=round_num
            )

        # All rounds finished
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
        logger.info("RPG %s completed: %d rounds in %.1fs", match_id, rounds, elapsed)

    except asyncio.CancelledError:
        logger.info("RPG %s task cancelled", match_id)
        await db.update_experiment_status(match_id, "stopped")
    except Exception as e:
        logger.error("RPG engine failed for %s: %s", match_id, e, exc_info=True)
        hub.publish(RelayEvent.ERROR, {
            "match_id": match_id,
            "message": str(e),
        })
        await db.update_experiment_status(match_id, "error")
