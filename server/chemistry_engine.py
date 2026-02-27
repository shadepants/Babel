"""Collaboration Chemistry Engine -- post-experiment process metrics.

Computes initiative balance, vocabulary influence flow, convergence rate,
and surprise index from turn + vocabulary data. Fires as a background task
after MATCH_COMPLETE.
"""

from __future__ import annotations

import json
import logging
import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from server.db import Database
    from server.event_hub import EventHub

logger = logging.getLogger(__name__)


async def compute_chemistry(
    experiment_id: str,
    db: "Database",
    hub: "EventHub | None" = None,
) -> dict | None:
    """Compute collaboration chemistry metrics for a completed experiment.

    Returns dict of metrics or None on failure. Persists to DB and publishes
    SSE event when complete.
    """
    try:
        turns = await db.get_turns(experiment_id)
        vocab = await db.get_vocabulary(experiment_id)

        if len(turns) < 2:
            logger.warning("Chemistry: too few turns for %s", experiment_id)
            return None

        # Identify unique speakers (skip System/empty speakers)
        speakers = []
        seen = set()
        for t in turns:
            s = t["speaker"]
            if s and s != "System" and s not in seen:
                speakers.append(s)
                seen.add(s)

        if len(speakers) < 2:
            logger.warning("Chemistry: fewer than 2 speakers for %s", experiment_id)
            return None

        # Use first two speakers as agent_a and agent_b
        agent_a, agent_b = speakers[0], speakers[1]

        # -- Initiative Balance --
        # Fraction of vocab words coined by each agent
        vocab_by_a = sum(1 for w in vocab if w.get("coined_by") == agent_a)
        vocab_by_b = sum(1 for w in vocab if w.get("coined_by") == agent_b)
        total_vocab = vocab_by_a + vocab_by_b
        initiative_a = vocab_by_a / total_vocab if total_vocab > 0 else 0.5
        initiative_b = vocab_by_b / total_vocab if total_vocab > 0 else 0.5

        # -- Vocabulary Influence Flow --
        # For each agent's turns, count how many of the OTHER agent's coined words appear
        words_coined_by_a = {w["word"].upper() for w in vocab if w.get("coined_by") == agent_a}
        words_coined_by_b = {w["word"].upper() for w in vocab if w.get("coined_by") == agent_b}

        influence_a_on_b = 0.0  # A's words appearing in B's turns
        influence_b_on_a = 0.0  # B's words appearing in A's turns
        turns_a_count = 0
        turns_b_count = 0

        for t in turns:
            content_upper = t["content"].upper()
            if t["speaker"] == agent_b:
                turns_b_count += 1
                for word in words_coined_by_a:
                    if word in content_upper:
                        influence_a_on_b += 1
            elif t["speaker"] == agent_a:
                turns_a_count += 1
                for word in words_coined_by_b:
                    if word in content_upper:
                        influence_b_on_a += 1

        # Normalize by turn count (influence per turn)
        if turns_b_count > 0:
            influence_a_on_b /= turns_b_count
        if turns_a_count > 0:
            influence_b_on_a /= turns_a_count

        # Cap at reasonable range [0, 10] then normalize to [0, 1]
        influence_a_on_b = min(influence_a_on_b / 10.0, 1.0)
        influence_b_on_a = min(influence_b_on_a / 10.0, 1.0)

        # -- Convergence Rate --
        # Per-round Jaccard similarity of vocabulary used; slope = convergence
        all_words = {w["word"].upper() for w in vocab}
        rounds_data = defaultdict(lambda: {"a": set(), "b": set()})

        for t in turns:
            content_upper = t["content"].upper()
            r = t["round"]
            used = {w for w in all_words if w in content_upper}
            if t["speaker"] == agent_a:
                rounds_data[r]["a"].update(used)
            elif t["speaker"] == agent_b:
                rounds_data[r]["b"].update(used)

        jaccards = []
        for r in sorted(rounds_data.keys()):
            a_words = rounds_data[r]["a"]
            b_words = rounds_data[r]["b"]
            union = a_words | b_words
            if union:
                jaccards.append(len(a_words & b_words) / len(union))

        # Linear regression slope of Jaccard over rounds
        convergence_rate = 0.0
        if len(jaccards) >= 2:
            n = len(jaccards)
            x_mean = (n - 1) / 2.0
            y_mean = sum(jaccards) / n
            num = sum((i - x_mean) * (j - y_mean) for i, j in enumerate(jaccards))
            den = sum((i - x_mean) ** 2 for i in range(n))
            if den > 0:
                convergence_rate = num / den
        # Clamp to [-1, 1]
        convergence_rate = max(-1.0, min(1.0, convergence_rate))

        # -- Surprise Index --
        # Per-turn vocab-usage vector distance from rolling mean
        # Higher = more surprising / less predictable
        turn_vectors = []
        word_list = sorted(all_words)
        word_idx = {w: i for i, w in enumerate(word_list)}

        for t in turns:
            if t["speaker"] not in (agent_a, agent_b):
                continue
            content_upper = t["content"].upper()
            vec = [0.0] * len(word_list)
            for w in word_list:
                if w in content_upper:
                    vec[word_idx[w]] = 1.0
            turn_vectors.append(vec)

        surprise_index = 0.5  # default
        if len(turn_vectors) >= 4 and len(word_list) > 0:
            distances = []
            for i in range(3, len(turn_vectors)):
                # Rolling mean of previous 3
                mean_vec = [0.0] * len(word_list)
                for j in range(i - 3, i):
                    for k in range(len(word_list)):
                        mean_vec[k] += turn_vectors[j][k] / 3.0
                # Cosine distance from mean
                dot = sum(a * b for a, b in zip(turn_vectors[i], mean_vec))
                mag_a = math.sqrt(sum(x * x for x in turn_vectors[i]))
                mag_b = math.sqrt(sum(x * x for x in mean_vec))
                if mag_a > 0 and mag_b > 0:
                    cosine_sim = dot / (mag_a * mag_b)
                    distances.append(1.0 - cosine_sim)
                else:
                    distances.append(0.5)
            if distances:
                surprise_index = sum(distances) / len(distances)
        # Clamp to [0, 1]
        surprise_index = max(0.0, min(1.0, surprise_index))

        metrics = {
            "experiment_id": experiment_id,
            "initiative_a": round(initiative_a, 4),
            "initiative_b": round(initiative_b, 4),
            "influence_a_on_b": round(influence_a_on_b, 4),
            "influence_b_on_a": round(influence_b_on_a, 4),
            "convergence_rate": round(convergence_rate, 4),
            "surprise_index": round(surprise_index, 4),
        }

        await db.save_collaboration_metrics(metrics)
        logger.info("Chemistry computed for %s: %s", experiment_id, metrics)

        if hub is not None:
            hub.publish("relay.chemistry_ready", {
                "match_id": experiment_id,
                **metrics,
            })

        return metrics

    except Exception as exc:
        logger.error("Chemistry computation failed for %s: %s", experiment_id, exc)
        return None
