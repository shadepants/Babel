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
    PersonaRecord,
    RelayAgent,
    RelayEvent,
    call_model,
    build_messages,
    check_pressure_valve,
    track_task,
    _log_task_exception,
    _extract_and_publish_vocab,
)
from server.summarizer_engine import update_layered_context

logger = logging.getLogger(__name__)


async def _save_rpg_memory(
    match_id: str,
    db: Database,
    dm_model: str,
    preset_key: str,
) -> None:
    """Background task: generate and persist RPG campaign memory."""
    summary = await db.generate_rpg_memory_summary(match_id)
    if summary:
        await db.create_memory(dm_model, preset_key, match_id, summary)
        logger.info("RPG memory saved for %s (%s)", match_id, preset_key)


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
    preset: str | None = None,
    participant_persona_ids: list[str | None] | None = None,
    rpg_config: dict | None = None,
    # Recovery: start parameters
    start_round: int = 1,
    start_index: int = 0,
    background_tasks: set[asyncio.Task] | None = None,
) -> None:
    """Run an RPG session with human-in-the-loop yielding."""
    # Build RelayAgent list for build_messages
    relay_agents = [
        RelayAgent(name=p["name"], model=p["model"])
        for p in participants
    ]

    turns: list[dict] = []
    # If resuming, load existing turns
    if start_round > 1 or start_index > 0:
        db_turns = await db.get_turns(match_id)
        turns = [{"speaker": t["speaker"], "content": t["content"], "visibility_json": t.get("visibility_json")} for t in db_turns]

    start_time = time.time()

    # -- Inject campaign parameters into DM system prompt --
    if rpg_config:
        tone = rpg_config.get("tone", "cinematic").upper()
        setting = rpg_config.get("setting", "fantasy").upper()
        diff = rpg_config.get("difficulty", "normal").upper()
        hook = rpg_config.get("campaign_hook", "")
        party_lines = "\n".join(
            f"  - {p['name']} ({p.get('char_class', p.get('role', 'Adventurer'))}): {p.get('motivation', '')}"
            for p in participants
            if p.get("role") != "dm"
        )
        campaign_block = (
            f"CAMPAIGN PARAMETERS\n"
            f"Tone: {tone} | Setting: {setting} | Difficulty: {diff}\n"
            f"Hook: {hook}\n\n"
            f"PARTY:\n{party_lines}\n"
        )
        system_prompt = campaign_block + system_prompt
        logger.info("RPG %s: injected campaign config (tone=%s, setting=%s, difficulty=%s)", match_id, tone, setting, diff)

    # -- Load past campaign memories for DM (inject into system_prompt) --
    dm_model = next(
        (p["model"] for p in participants if p.get("role") == "dm" and p["model"] != "human"),
        None,
    )
    preset_key = f"rpg:{preset}" if preset else "rpg:custom"
    if dm_model:
        past_memories = await db.get_memories_for_pair(dm_model, preset_key)
        if past_memories:
            memory_block = "\n\n".join(m["summary"] for m in past_memories[:3])
            system_prompt = f"CAMPAIGN HISTORY:\n{memory_block}\n\n{system_prompt}"
            logger.info("RPG %s: injected %d past campaign memories", match_id, len(past_memories[:3]))

    # -- Build persona map: index -> PersonaRecord (if persona_ids provided) --
    persona_map: dict[int, PersonaRecord] = {}
    if participant_persona_ids:
        for idx, pid in enumerate(participant_persona_ids):
            if pid:
                p_data = await db.get_persona(pid)
                if p_data:
                    persona_map[idx] = PersonaRecord(
                        id=p_data["id"],
                        name=p_data["name"],
                        personality=p_data["personality"],
                        backstory=p_data["backstory"],
                    )

    try:
        for round_num in range(start_round, start_round + rounds):
            # Check for cancellation at round boundary
            if cancel_event and cancel_event.is_set():
                elapsed = time.time() - start_time
                await db.update_experiment_status(
                    match_id, "stopped",
                    rounds_completed=round_num - 1,
                    elapsed_seconds=round(elapsed, 1),
                )
                await db.delete_rpg_state(match_id)
                hub.publish(RelayEvent.MATCH_COMPLETE, {
                    "match_id": match_id,
                    "rounds": round_num - 1,
                    "elapsed_s": round(elapsed, 1),
                    "stopped": True,
                })
                logger.info("RPG %s stopped by user after %d rounds", match_id, round_num - 1)
                return

            for actor_idx, actor in enumerate(participants):
                # Skip already completed actors if resuming mid-round
                if round_num == start_round and actor_idx < start_index:
                    continue

                # --- 1. Persist State for Recovery ---
                await db.save_rpg_state(
                    match_id=match_id,
                    current_round=round_num,
                    current_speaker_idx=actor_idx,
                    is_awaiting_human=(actor["model"] == "human")
                )

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

                persona = persona_map.get(actor_idx)
                agent = RelayAgent(
                    name=actor["name"],
                    model=actor["model"],
                    temperature=actor.get("temperature", 0.7),
                    max_tokens=actor.get("max_tokens", 1500),
                    persona=persona,
                )

                # Phase 17: Fetch layered context
                cold_context = await db.get_latest_cold_summary(match_id)
                world_bible = await db.get_world_state(match_id)

                if agent.persona:
                    actor_system = (
                        f"You are {agent.persona.name}. {agent.persona.personality}"
                    )
                    if agent.persona.backstory:
                        actor_system += f"\n\nBackground: {agent.persona.backstory}"
                    actor_system += f"\n\n{system_prompt}"
                else:
                    actor_system = system_prompt

                # RPG uses layered context: Cold recap + World Bible + Hot sliding window
                hot_turns = turns[-10:] if len(turns) > 10 else turns
                
                seed_turn = {"speaker": "", "content": seed}
                messages = build_messages(
                    actor_system, [seed_turn] + hot_turns, actor_idx, relay_agents,
                    cold_context=cold_context,
                    world_bible=world_bible
                )

                _model_task = asyncio.create_task(call_model(agent, messages))
                if cancel_event:
                    _cw = asyncio.create_task(cancel_event.wait())
                    await asyncio.wait({_model_task, _cw}, return_when=asyncio.FIRST_COMPLETED)
                    _cw.cancel()
                    if cancel_event.is_set():
                        _model_task.cancel()
                        await asyncio.gather(_model_task, return_exceptions=True)
                        raise asyncio.CancelledError()
                content, latency, tokens = await _model_task
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

                _vocab_task = asyncio.create_task(_extract_and_publish_vocab(
                    content, actor["name"], round_num, match_id, hub, db, set(),
                    preset=preset,
                ))
                if background_tasks is not None:
                    track_task(_vocab_task, background_tasks)
                else:
                    _vocab_task.add_done_callback(_log_task_exception)

                # Phase 17: Update layered context asynchronously every 2 rounds
                if round_num % 2 == 0 and actor_idx == len(participants) - 1:
                    _summarize_task = asyncio.create_task(update_layered_context(match_id, db))
                    if background_tasks is not None:
                        track_task(_summarize_task, background_tasks)
                    else:
                        _summarize_task.add_done_callback(_log_task_exception)

                # Phase 17: Zero-Sum Pressure Valve (E3)
                if round_num % 3 == 0 and actor_idx == len(participants) - 1:
                    from server.config import JUDGE_MODEL
                    if preset and any(x in preset.lower() for x in ("debate", "conflict", "dilemma", "adversarial")):
                        intervention = await check_pressure_valve(match_id, turns, JUDGE_MODEL)
                        if intervention:
                            logger.info("RPG Pressure valve TRIGGERED for %s: %s", match_id, intervention)
                            turns.append({"speaker": "System", "content": intervention})
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
        await db.delete_rpg_state(match_id)
        hub.publish(RelayEvent.MATCH_COMPLETE, {
            "match_id": match_id,
            "rounds": rounds,
            "elapsed_s": round(elapsed, 1),
        })
        logger.info("RPG %s completed: %d rounds in %.1fs", match_id, rounds, elapsed)

        # Save campaign memory for future sessions
        if dm_model:
            _mem_task = asyncio.create_task(
                _save_rpg_memory(match_id, db, dm_model, preset_key),
                name=f"rpg_memory_{match_id}",
            )
            if background_tasks is not None:
                track_task(_mem_task, background_tasks)
            else:
                _mem_task.add_done_callback(_log_task_exception)

    except asyncio.CancelledError:
        logger.info("RPG %s task cancelled", match_id)
        try:
            await db.update_experiment_status(match_id, "stopped")
            # Preserve rpg_state on forced cancel -- allows recovery on next startup
        except Exception as _db_err:
            logger.debug("RPG %s: DB unavailable during cancel cleanup: %s", match_id, _db_err)
    except Exception as e:
        logger.error("RPG engine failed for %s: %s", match_id, e, exc_info=True)
        hub.publish(RelayEvent.ERROR, {
            "match_id": match_id,
            "message": str(e),
        })
        await db.update_experiment_status(match_id, "failed")
