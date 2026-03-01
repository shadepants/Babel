"""Summarizer engine -- condensing conversation history and extracting world state.

Uses a fast, low-cost model (gemini-2.5-flash) to generate narrative recaps
(Cold Context) and maintain a persistent JSON world bible (Frozen Context).
"""

import json
import logging
from typing import TYPE_CHECKING

import litellm

if TYPE_CHECKING:
    from server.db import Database

logger = logging.getLogger(__name__)

async def update_layered_context(match_id: str, db: "Database", model: str = "gemini-2.5-flash") -> None:
    """Background task to condense history and extract entities.
    
    1. Fetch all turns.
    2. Generate a 3-sentence summary of turns older than the Hot window (last 10).
    3. Extract/Update World Bible (NPCs, Locations, Artifacts).
    4. Persist to cold_summaries and world_state tables.
    """
    try:
        turns = await db.get_turns(match_id)
        if len(turns) < 6:
            return # Not enough history to summarize yet

        # --- 1. Cold Summary ---
        hot_threshold = 10
        to_summarize = turns[:-hot_threshold]
        last_summarized_round = to_summarize[-1]["round"]
        
        transcript = "\n".join([f"[{t['speaker']}]: {t['content'][:200]}" for t in to_summarize])
        
        summary_prompt = (
            "Recap the following conversation history in 3 concise sentences. "
            "Focus on major plot points and character decisions. "
            "Keep it in third-person narrative style.\n\n"
            f"History:\n{transcript}"
        )
        
        res = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": summary_prompt}],
            max_tokens=150,
            temperature=0.3
        )
        cold_summary = res.choices[0].message.content.strip()
        
        # Persist summary
        await db.db.execute(
            """INSERT INTO cold_summaries (match_id, through_round, summary, created_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(match_id, through_round) DO UPDATE SET summary=excluded.summary""",
            (match_id, last_summarized_round, cold_summary)
        )
        await db.db.commit()

        # --- 2. World Bible Extraction ---
        bible_prompt = (
            "Extract a JSON list of key entities (NPCs, Locations, Artifacts) and their "
            "current status based on this history. Return ONLY valid JSON:\n"
            '{"npcs": [{"name": "...", "status": "..."}], "locations": [...], "items": [...]}'
            "\n\n"
            f"History:\n{transcript}"
        )
        
        res_b = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": bible_prompt}],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        world_state = res_b.choices[0].message.content
        
        await db.db.execute(
            """INSERT INTO world_state (match_id, state_json, updated_at)
               VALUES (?, ?, datetime('now'))
               ON CONFLICT(match_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at""",
            (match_id, world_state)
        )
        await db.db.commit()
        
        logger.info("Updated layered context for %s through round %d", match_id, last_summarized_round)

    except Exception as e:
        logger.error("Layered context update failed for %s: %s", match_id, e)


async def generate_entity_snapshot(
    match_id: str, db: "Database", model: str = "gemini/gemini-2.5-flash"
) -> dict | None:
    """LLM-generated entity chronicle for a completed RPG session.

    Fetches world state + cold summary + last 15 turns, then calls an LLM
    to produce a structured JSON chronicle keyed on NPCs, locations, items,
    unresolved threads, and party character arcs.
    Returns a dict on success, or None if the session is empty or the LLM fails.
    """
    try:
        turns = await db.get_turns(match_id)
        if not turns:
            return None

        recent = turns[-15:]
        transcript = "\n".join(
            f"[{t['speaker']}]: {t['content'][:300]}" for t in recent
        )

        world_json = await db.get_world_state(match_id)
        cold_summary = await db.get_latest_cold_summary(match_id)

        context_parts: list[str] = []
        if cold_summary:
            context_parts.append(f"NARRATIVE RECAP:\n{cold_summary}")
        if world_json:
            context_parts.append(f"KNOWN ENTITIES:\n{world_json}")
        context_parts.append(f"RECENT TURNS:\n{transcript}")
        context = "\n\n".join(context_parts)

        prompt = (
            "You are archiving a completed RPG campaign session. "
            "Based on the session context below, create a structured entity chronicle. "
            "Return ONLY valid JSON with exactly these keys:\n"
            '{"npcs": [{"name": "...", "initial_role": "...", "final_status": "...", "key_moment": "..."}], '
            '"locations": [{"name": "...", "description": "...", "significance": "..."}], '
            '"items": [{"name": "...", "last_holder": "...", "fate": "..."}], '
            '"unresolved_threads": ["..."], '
            '"party_arcs": {"<character_name>": "<one-line arc>"}}\n\n'
            f"{context}"
        )

        res = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=2000,
            temperature=0.3,
        )
        choice = res.choices[0]
        if choice.finish_reason == "length":
            logger.warning(
                "Entity snapshot truncated by max_tokens for %s — increase limit or shorten prompt",
                match_id,
            )
        raw = choice.message.content
        return json.loads(raw)

    except Exception as exc:
        logger.error("Entity snapshot generation failed for %s: %s", match_id, exc)
        return None
