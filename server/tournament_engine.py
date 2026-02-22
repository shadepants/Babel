"""Tournament engine — runs sequential matches for multi-model tournaments.

Reuses run_relay for each match. Runs matches sequentially to avoid
API rate limits. Publishes tournament-level SSE events via EventHub.
"""

from __future__ import annotations

import json
import logging
import time
from typing import TYPE_CHECKING

from server.config import get_display_name
from server.relay_engine import RelayAgent, run_relay

if TYPE_CHECKING:
    from server.event_hub import EventHub
    from server.db import Database

logger = logging.getLogger(__name__)


class TournamentEvent:
    """SSE event types for tournament lifecycle."""
    MATCH_STARTED = "tournament.match_started"
    MATCH_COMPLETE = "tournament.match_complete"
    COMPLETE = "tournament.complete"
    ERROR = "tournament.error"


async def run_tournament(
    tournament_id: str,
    hub: EventHub,
    db: Database,
) -> None:
    """Run all matches in a tournament sequentially.

    Fetches tournament config from DB, iterates over matches
    in match_order, calls run_relay for each. Publishes tournament
    SSE events between matches using match_id=tournament_id so
    the existing EventHub filter works unchanged.
    """
    tournament = await db.get_tournament(tournament_id)
    if not tournament:
        logger.error("Tournament %s not found", tournament_id)
        return

    matches = await db.get_tournament_matches(tournament_id)
    config = {}
    if tournament.get("config_json"):
        config = json.loads(tournament["config_json"])

    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("max_tokens", 1500)
    start_time = time.time()

    await db.update_tournament_status(tournament_id, "running")

    completed = 0
    try:
        for match in matches:
            # Create experiment for this match
            experiment_id = await db.create_experiment(
                model_a=match["model_a"],
                model_b=match["model_b"],
                seed=tournament["seed"],
                system_prompt=tournament["system_prompt"],
                rounds_planned=tournament["rounds"],
                preset=tournament.get("preset"),
                config=config,
            )

            # Link experiment to tournament match
            await db.update_tournament_match(
                match["id"], "running", experiment_id=experiment_id,
            )

            hub.publish(TournamentEvent.MATCH_STARTED, {
                "match_id": tournament_id,
                "tournament_id": tournament_id,
                "match_order": match["match_order"],
                "total_matches": tournament["total_matches"],
                "model_a": match["model_a"],
                "model_b": match["model_b"],
                "experiment_id": experiment_id,
            })

            logger.info(
                "Tournament %s match %d/%d: %s vs %s (experiment %s)",
                tournament_id,
                match["match_order"],
                tournament["total_matches"],
                get_display_name(match["model_a"]),
                get_display_name(match["model_b"]),
                experiment_id,
            )

            # Run the relay — await (sequential), not create_task
            agent_a = RelayAgent(
                name=get_display_name(match["model_a"]),
                model=match["model_a"],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            agent_b = RelayAgent(
                name=get_display_name(match["model_b"]),
                model=match["model_b"],
                temperature=temperature,
                max_tokens=max_tokens,
            )

            try:
                await run_relay(
                    match_id=experiment_id,
                    agent_a=agent_a,
                    agent_b=agent_b,
                    seed=tournament["seed"],
                    system_prompt=tournament["system_prompt"],
                    rounds=tournament["rounds"],
                    hub=hub,
                    db=db,
                )
                await db.update_tournament_match(match["id"], "completed")
                completed += 1  # only count successfully completed matches
            except Exception as e:
                logger.error(
                    "Tournament %s match %d failed: %s",
                    tournament_id, match["match_order"], e,
                )
                await db.update_tournament_match(match["id"], "failed")

            await db.update_tournament_status(
                tournament_id, "running", completed_matches=completed,
            )

            hub.publish(TournamentEvent.MATCH_COMPLETE, {
                "match_id": tournament_id,
                "tournament_id": tournament_id,
                "match_order": match["match_order"],
                "total_matches": tournament["total_matches"],
                "experiment_id": experiment_id,
            })

        # All matches done
        elapsed = time.time() - start_time
        await db.update_tournament_status(
            tournament_id, "completed", completed_matches=completed,
        )
        hub.publish(TournamentEvent.COMPLETE, {
            "match_id": tournament_id,
            "tournament_id": tournament_id,
            "total_matches": tournament["total_matches"],
            "elapsed_s": round(elapsed, 1),
        })
        logger.info(
            "Tournament %s completed: %d matches in %.1fs",
            tournament_id, completed, elapsed,
        )

    except Exception as e:
        logger.error("Tournament %s failed: %s", tournament_id, e)
        await db.update_tournament_status(tournament_id, "failed")
        hub.publish(TournamentEvent.ERROR, {
            "match_id": tournament_id,
            "tournament_id": tournament_id,
            "message": "Tournament failed unexpectedly. Check server logs.",
        })
