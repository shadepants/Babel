"""SQLite database for Babel experiments, turns, and vocabulary.

Uses aiosqlite for async access with WAL mode for concurrent reads
while the relay engine writes. All foreign keys are enforced.
"""

import asyncio
import aiosqlite
import json
import math
import uuid
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
from typing import Any

from server.config import get_display_name

DB_PATH = Path(__file__).resolve().parent.parent / ".babel_data" / "babel.db"

# ── Schema ──────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    preset TEXT,
    seed TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    rounds_planned INTEGER,
    rounds_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running'
        CHECK(status IN ('running', 'completed', 'failed', 'stopped')),
    elapsed_seconds REAL,
    config_json TEXT
);

CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    speaker TEXT NOT NULL,
    model TEXT NOT NULL,
    content TEXT NOT NULL,
    latency_seconds REAL,
    token_count INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_experiment ON turns(experiment_id);

CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    meaning TEXT,
    coined_by TEXT,
    coined_round INTEGER,
    category TEXT,
    usage_count INTEGER DEFAULT 1,
    parent_words TEXT,
    confidence TEXT DEFAULT 'high'
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_experiment ON vocabulary(experiment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_unique
    ON vocabulary(experiment_id, word);

CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    preset TEXT,
    seed TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    rounds INTEGER NOT NULL,
    config_json TEXT,
    models_json TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_matches INTEGER DEFAULT 0,
    completed_matches INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    experiment_id TEXT REFERENCES experiments(id) ON DELETE SET NULL,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    match_order INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_tourn_matches_tid
    ON tournament_matches(tournament_id);

CREATE TABLE IF NOT EXISTS turn_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turn_id INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
    creativity REAL,
    coherence REAL,
    engagement REAL,
    novelty REAL,
    scored_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_turn_scores_turn
    ON turn_scores(turn_id);

CREATE TABLE IF NOT EXISTS model_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    experiment_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_pair ON model_memory(model_a, model_b);
"""


# ── Database Manager ────────────────────────────────────────────────────

class Database:
    """Async SQLite database with WAL mode and foreign key enforcement."""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None
        self._write_lock: asyncio.Lock | None = None

    async def connect(self) -> None:
        """Open the database connection and initialize schema."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._write_lock = asyncio.Lock()  # serializes concurrent write tasks
        self._db = await aiosqlite.connect(str(self.db_path))
        self._db.row_factory = aiosqlite.Row

        # Hardening pragmas
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA foreign_keys=ON")
        await self._db.execute("PRAGMA synchronous=NORMAL")

        await self._db.executescript(_SCHEMA)
        await self._db.commit()

        # ── Migrations (idempotent ALTER TABLE additions) ──
        # SQLite ignores IF NOT EXISTS on columns, so we catch the error instead.
        try:
            await self._db.execute(
                "ALTER TABLE vocabulary ADD COLUMN confidence TEXT DEFAULT 'high'"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        for col, default in [
            ("temperature_a", "0.7"),
            ("temperature_b", "0.7"),
        ]:
            try:
                await self._db.execute(
                    f"ALTER TABLE experiments ADD COLUMN {col} REAL DEFAULT {default}"
                )
                await self._db.commit()
            except Exception:
                pass  # column already exists

        for col, ddl in [
            ("judge_model", "TEXT"),
            ("enable_scoring", "INTEGER DEFAULT 0"),
            ("enable_verdict", "INTEGER DEFAULT 0"),
            ("winner", "TEXT"),
            ("verdict_reasoning", "TEXT"),
        ]:
            try:
                await self._db.execute(
                    f"ALTER TABLE experiments ADD COLUMN {col} {ddl}"
                )
                await self._db.commit()
            except Exception:
                pass  # column already exists

    async def close(self) -> None:
        """Close the database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    @property
    def db(self) -> aiosqlite.Connection:
        if self._db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db

    # ── Experiments ──────────────────────────────────────────────────

    async def create_experiment(
        self,
        model_a: str,
        model_b: str,
        seed: str,
        system_prompt: str,
        rounds_planned: int,
        preset: str | None = None,
        config: dict[str, Any] | None = None,
        temperature_a: float = 0.7,
        temperature_b: float = 0.7,
        judge_model: str | None = None,
        enable_scoring: bool = False,
        enable_verdict: bool = False,
    ) -> str:
        """Create a new experiment and return its ID."""
        experiment_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        config_json = json.dumps(config) if config else None

        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO experiments
                   (id, created_at, model_a, model_b, preset, seed,
                    system_prompt, rounds_planned, config_json,
                    temperature_a, temperature_b,
                    judge_model, enable_scoring, enable_verdict)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (experiment_id, now, model_a, model_b, preset, seed,
                 system_prompt, rounds_planned, config_json,
                 temperature_a, temperature_b,
                 judge_model, int(enable_scoring), int(enable_verdict)),
            )
            await self.db.commit()
        return experiment_id

    async def get_experiment(self, experiment_id: str) -> dict | None:
        """Fetch a single experiment by ID."""
        cursor = await self.db.execute(
            "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def list_experiments(
        self,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
    ) -> list[dict]:
        """List experiments, most recent first. Optional status filter and pagination."""
        query = "SELECT * FROM experiments"
        params: list[Any] = []
        if status:
            query += " WHERE status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor = await self.db.execute(query, params)
        return [dict(row) for row in await cursor.fetchall()]

    async def update_experiment_status(
        self,
        experiment_id: str,
        status: str,
        rounds_completed: int | None = None,
        elapsed_seconds: float | None = None,
    ) -> None:
        """Update experiment status and optional completion fields."""
        parts = ["status = ?"]
        params: list[Any] = [status]
        if rounds_completed is not None:
            parts.append("rounds_completed = ?")
            params.append(rounds_completed)
        if elapsed_seconds is not None:
            parts.append("elapsed_seconds = ?")
            params.append(elapsed_seconds)
        params.append(experiment_id)

        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                f"UPDATE experiments SET {', '.join(parts)} WHERE id = ?",
                params,
            )
            await self.db.commit()

    async def save_verdict(
        self,
        experiment_id: str,
        winner: str,
        verdict_reasoning: str,
    ) -> None:
        """Persist the final verdict for an experiment."""
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                "UPDATE experiments SET winner = ?, verdict_reasoning = ? WHERE id = ?",
                (winner, verdict_reasoning, experiment_id),
            )
            await self.db.commit()

    async def delete_experiment(self, experiment_id: str) -> None:
        """Delete an experiment and all associated data (cascades via FK)."""
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute("DELETE FROM experiments WHERE id = ?", (experiment_id,))
            await self.db.commit()

    # ── Turns ────────────────────────────────────────────────────────

    async def add_turn(
        self,
        experiment_id: str,
        round_num: int,
        speaker: str,
        model: str,
        content: str,
        latency_seconds: float | None = None,
        token_count: int | None = None,
    ) -> int:
        """Insert a conversation turn. Returns the turn ID."""
        now = datetime.now(timezone.utc).isoformat()
        async with self._write_lock:  # type: ignore[union-attr]
            cursor = await self.db.execute(
                """INSERT INTO turns
                   (experiment_id, round, speaker, model, content,
                    latency_seconds, token_count, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (experiment_id, round_num, speaker, model, content,
                 latency_seconds, token_count, now),
            )
            await self.db.commit()
        return cursor.lastrowid

    async def get_turns(self, experiment_id: str) -> list[dict]:
        """Get all turns for an experiment, ordered by round and ID."""
        cursor = await self.db.execute(
            "SELECT * FROM turns WHERE experiment_id = ? ORDER BY round, id",
            (experiment_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def insert_turn_score(
        self,
        turn_id: int,
        creativity: float,
        coherence: float,
        engagement: float,
        novelty: float,
    ) -> None:
        """Persist scores for a single turn."""
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO turn_scores (turn_id, creativity, coherence, engagement, novelty)
                   VALUES (?, ?, ?, ?, ?)""",
                (turn_id, creativity, coherence, engagement, novelty),
            )
            await self.db.commit()

    async def get_turn_scores(self, experiment_id: str) -> list[dict]:
        """Get all turn scores for an experiment, joined on turn_id."""
        cursor = await self.db.execute(
            """SELECT ts.turn_id, ts.creativity, ts.coherence,
                      ts.engagement, ts.novelty, ts.scored_at
               FROM turn_scores ts
               JOIN turns t ON t.id = ts.turn_id
               WHERE t.experiment_id = ?
               ORDER BY t.round, t.id""",
            (experiment_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    # ── Vocabulary ───────────────────────────────────────────────────

    async def upsert_word(
        self,
        experiment_id: str,
        word: str,
        meaning: str | None = None,
        coined_by: str | None = None,
        coined_round: int | None = None,
        category: str | None = None,
        parent_words: list[str] | None = None,
        confidence: str = "high",
    ) -> None:
        """Insert a vocabulary word or bump usage_count if it already exists.

        Uses SQLite's ON CONFLICT upsert for atomicity — a single query
        handles both creation and re-encounter counting.
        On re-encounter, updates meaning if the new one is longer/richer.
        """
        parents_json = json.dumps(parent_words) if parent_words else None
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO vocabulary
                   (experiment_id, word, meaning, coined_by, coined_round,
                    category, parent_words, confidence)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(experiment_id, word)
                   DO UPDATE SET
                       usage_count = usage_count + 1,
                       meaning = CASE
                           WHEN excluded.meaning IS NOT NULL
                                AND (meaning IS NULL OR length(excluded.meaning) > length(meaning))
                           THEN excluded.meaning
                           ELSE meaning
                       END""",
                (experiment_id, word, meaning, coined_by, coined_round,
                 category, parents_json, confidence),
            )
            await self.db.commit()

    async def get_vocabulary(self, experiment_id: str) -> list[dict]:
        """Get all vocabulary for an experiment, ordered by round coined."""
        cursor = await self.db.execute(
            """SELECT * FROM vocabulary
               WHERE experiment_id = ?
               ORDER BY coined_round, id""",
            (experiment_id,),
        )
        rows = [dict(row) for row in await cursor.fetchall()]
        for row in rows:
            if row.get("parent_words"):
                row["parent_words"] = json.loads(row["parent_words"])
        return rows

    # ── Analytics ─────────────────────────────────────────────────────

    async def get_experiment_stats(self, experiment_id: str) -> dict:
        """Pre-aggregated analytics for one experiment.

        Returns per-round latency/tokens broken out by speaker position,
        vocabulary growth curve, and summary totals. The frontend receives
        chart-ready data without needing to crunch raw turns.
        """
        # Fetch experiment to know speaker names
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return {"turns_by_round": [], "vocab_by_round": [], "totals": {}}
        # turns.speaker stores display names; experiments store litellm strings
        model_a_name = get_display_name(exp["model_a"])
        model_b_name = get_display_name(exp["model_b"])

        # Per-turn data ordered by round
        cursor = await self.db.execute(
            """SELECT round, speaker, latency_seconds, token_count
               FROM turns WHERE experiment_id = ? ORDER BY round, id""",
            (experiment_id,),
        )
        turn_rows = await cursor.fetchall()

        # Group turns into per-round stats
        rounds_data: dict[int, dict] = {}
        total_tokens = 0
        latencies_a: list[float] = []
        latencies_b: list[float] = []

        for row in turn_rows:
            r = row["round"]
            if r not in rounds_data:
                rounds_data[r] = {
                    "round": r,
                    "model_a_latency": None, "model_b_latency": None,
                    "model_a_tokens": None, "model_b_tokens": None,
                }
            entry = rounds_data[r]
            lat = row["latency_seconds"]
            tok = row["token_count"]

            # First speaker in each round wrote model_a, second wrote model_b
            if row["speaker"] == model_a_name or (
                row["speaker"] != model_b_name and entry["model_a_latency"] is None
            ):
                entry["model_a_latency"] = round(lat, 2) if lat else None
                entry["model_a_tokens"] = tok
                if lat:
                    latencies_a.append(lat)
            else:
                entry["model_b_latency"] = round(lat, 2) if lat else None
                entry["model_b_tokens"] = tok
                if lat:
                    latencies_b.append(lat)

            if tok:
                total_tokens += tok

        turns_by_round = sorted(rounds_data.values(), key=lambda x: x["round"])

        # Vocab growth curve (cumulative words coined by round)
        cursor = await self.db.execute(
            """SELECT coined_round, COUNT(*) as count
               FROM vocabulary WHERE experiment_id = ?
               GROUP BY coined_round ORDER BY coined_round""",
            (experiment_id,),
        )
        vocab_rows = await cursor.fetchall()
        cumulative = 0
        vocab_by_round = []
        for row in vocab_rows:
            cumulative += row["count"]
            vocab_by_round.append({
                "round": row["coined_round"],
                "cumulative_count": cumulative,
            })

        return {
            "turns_by_round": turns_by_round,
            "vocab_by_round": vocab_by_round,
            "totals": {
                "total_turns": len(turn_rows),
                "total_tokens": total_tokens,
                "avg_latency_a": round(sum(latencies_a) / len(latencies_a), 2) if latencies_a else None,
                "avg_latency_b": round(sum(latencies_b) / len(latencies_b), 2) if latencies_b else None,
                "vocab_count": cumulative,
            },
        }

    # ── Tournaments ───────────────────────────────────────────────────

    async def create_tournament(
        self,
        name: str,
        models: list[str],
        seed: str,
        system_prompt: str,
        rounds: int,
        preset: str | None = None,
        config: dict[str, Any] | None = None,
    ) -> str:
        """Create a tournament with all round-robin pairings.

        Generates every unique pairing from the models list using
        itertools.combinations. Returns the tournament ID.
        """
        tournament_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        pairings = list(combinations(models, 2))

        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO tournaments
                   (id, name, preset, seed, system_prompt, rounds,
                    config_json, models_json, total_matches, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    tournament_id, name, preset, seed, system_prompt, rounds,
                    json.dumps(config) if config else None,
                    json.dumps(models),
                    len(pairings),
                    now,
                ),
            )

            for order, (model_a, model_b) in enumerate(pairings, start=1):
                await self.db.execute(
                    """INSERT INTO tournament_matches
                       (tournament_id, model_a, model_b, match_order)
                       VALUES (?, ?, ?, ?)""",
                    (tournament_id, model_a, model_b, order),
                )

            await self.db.commit()
        return tournament_id

    async def get_tournament(self, tournament_id: str) -> dict | None:
        """Fetch a tournament by ID, with models_json parsed."""
        cursor = await self.db.execute(
            "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["models"] = json.loads(d["models_json"])
        return d

    async def list_tournaments(
        self, limit: int = 50, offset: int = 0,
    ) -> list[dict]:
        """List tournaments, most recent first."""
        cursor = await self.db.execute(
            "SELECT * FROM tournaments ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = [dict(row) for row in await cursor.fetchall()]
        for row in rows:
            row["models"] = json.loads(row["models_json"])
        return rows

    async def get_tournament_matches(self, tournament_id: str) -> list[dict]:
        """Get all matches for a tournament, ordered by match_order."""
        cursor = await self.db.execute(
            """SELECT * FROM tournament_matches
               WHERE tournament_id = ? ORDER BY match_order""",
            (tournament_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def update_tournament_status(
        self,
        tournament_id: str,
        status: str,
        completed_matches: int | None = None,
    ) -> None:
        """Update tournament status and optionally completed_matches."""
        parts = ["status = ?"]
        params: list[Any] = [status]
        if completed_matches is not None:
            parts.append("completed_matches = ?")
            params.append(completed_matches)
        params.append(tournament_id)
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                f"UPDATE tournaments SET {', '.join(parts)} WHERE id = ?", params,
            )
            await self.db.commit()

    async def update_tournament_match(
        self,
        match_id: int,
        status: str,
        experiment_id: str | None = None,
    ) -> None:
        """Update a tournament match's status and experiment link."""
        parts = ["status = ?"]
        params: list[Any] = [status]
        if experiment_id is not None:
            parts.append("experiment_id = ?")
            params.append(experiment_id)
        params.append(match_id)
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                f"UPDATE tournament_matches SET {', '.join(parts)} WHERE id = ?",
                params,
            )
            await self.db.commit()

    async def get_tournament_leaderboard(self, tournament_id: str) -> list[dict]:
        """Aggregate per-model stats across all completed tournament matches.

        For each model, computes: matches_played, avg_latency, avg_tokens,
        total_vocab_coined, plus raw radar axes (verbosity, speed, creativity,
        consistency, engagement). Sorted by total_vocab_coined DESC.
        Winner = first row.
        """
        matches = await self.get_tournament_matches(tournament_id)
        completed_exp_ids = [
            m["experiment_id"]
            for m in matches
            if m["status"] == "completed" and m["experiment_id"]
        ]
        if not completed_exp_ids:
            return []

        # Gather per-model raw data across all completed experiments
        model_data: dict[str, dict] = {}  # model -> aggregated data

        for exp_id in completed_exp_ids:
            exp = await self.get_experiment(exp_id)
            if not exp:
                continue

            cursor = await self.db.execute(
                """SELECT model, latency_seconds, token_count, round
                   FROM turns WHERE experiment_id = ? ORDER BY round, id""",
                (exp_id,),
            )
            turn_rows = await cursor.fetchall()

            cursor = await self.db.execute(
                """SELECT coined_by, COUNT(*) as count
                   FROM vocabulary WHERE experiment_id = ?
                   GROUP BY coined_by""",
                (exp_id,),
            )
            vocab_rows = await cursor.fetchall()
            vocab_by_model = {r["coined_by"]: r["count"] for r in vocab_rows}

            # Map speaker names to model strings
            speakers = {}
            for row in turn_rows:
                speakers[row["model"]] = True

            for model_str in [exp["model_a"], exp["model_b"]]:
                if model_str not in model_data:
                    model_data[model_str] = {
                        "latencies": [],
                        "token_counts": [],
                        "vocab_coined": 0,
                        "matches": 0,
                        "rounds_tokens": {},  # round -> [token_counts]
                    }
                md = model_data[model_str]
                md["matches"] += 1

            # Assign turn data to the correct model
            # Speaker names in turns match display names used in relay
            # but model column has the litellm string
            for row in turn_rows:
                model_str = row["model"]
                if model_str not in model_data:
                    continue
                md = model_data[model_str]
                if row["latency_seconds"]:
                    md["latencies"].append(row["latency_seconds"])
                if row["token_count"]:
                    md["token_counts"].append(row["token_count"])
                    r = row["round"]
                    md["rounds_tokens"].setdefault(r, []).append(row["token_count"])

            # Vocab: speaker names are display names, need to map
            # The relay engine uses get_display_name for speaker names
            from server.config import get_display_name
            for model_str in [exp["model_a"], exp["model_b"]]:
                display = get_display_name(model_str)
                if display in vocab_by_model:
                    model_data[model_str]["vocab_coined"] += vocab_by_model[display]

        # Compute per-model stats
        entries = []
        for model_str, md in model_data.items():
            from server.config import get_display_name
            lats = md["latencies"]
            toks = md["token_counts"]
            avg_lat = sum(lats) / len(lats) if lats else None
            avg_tok = sum(toks) / len(toks) if toks else None

            # Radar raw values
            verbosity_raw = avg_tok or 0
            speed_raw = (1.0 / avg_lat) if avg_lat and avg_lat > 0 else 0
            creativity_raw = md["vocab_coined"]

            # Consistency = inverse of latency std dev
            if len(lats) >= 2:
                mean_lat = sum(lats) / len(lats)
                variance = sum((x - mean_lat) ** 2 for x in lats) / len(lats)
                std_lat = math.sqrt(variance)
                consistency_raw = 1.0 / (std_lat + 0.01)  # avoid div by zero
            else:
                # Single data point = no variance = perfectly consistent
                consistency_raw = 1.0 / 0.01

            # Engagement = slope of avg tokens per round (growth rate)
            rt = md["rounds_tokens"]
            if len(rt) >= 2:
                rounds_sorted = sorted(rt.keys())
                avgs = [sum(rt[r]) / len(rt[r]) for r in rounds_sorted]
                # Simple linear regression slope
                n = len(avgs)
                x_mean = sum(rounds_sorted) / n
                y_mean = sum(avgs) / n
                numer = sum((x - x_mean) * (y - y_mean) for x, y in zip(rounds_sorted, avgs))
                denom = sum((x - x_mean) ** 2 for x in rounds_sorted)
                engagement_raw = numer / denom if denom > 0 else 0
            else:
                engagement_raw = 0

            entries.append({
                "model": model_str,
                "display_name": get_display_name(model_str),
                "matches_played": md["matches"],
                "avg_latency": round(avg_lat, 2) if avg_lat else None,
                "avg_tokens": round(avg_tok, 0) if avg_tok else None,
                "total_vocab_coined": md["vocab_coined"],
                "verbosity_raw": verbosity_raw,
                "speed_raw": speed_raw,
                "creativity_raw": creativity_raw,
                "consistency_raw": consistency_raw,
                "engagement_raw": engagement_raw,
            })

        # Normalize radar axes to 0-1 across all models
        for axis in ["verbosity", "speed", "creativity", "consistency", "engagement"]:
            raw_key = f"{axis}_raw"
            values = [e[raw_key] for e in entries]
            max_val = max(values) if values else 1
            min_val = min(values) if values else 0
            if max_val == min_val:
                # All models identical on this axis — assign uniform score
                for e in entries:
                    e[axis] = 1.0
                    del e[raw_key]
            else:
                span = max_val - min_val
                for e in entries:
                    e[axis] = round((e[raw_key] - min_val) / span, 3)
                    del e[raw_key]

        # Sort by total vocab coined (winner = first)
        entries.sort(key=lambda e: e["total_vocab_coined"], reverse=True)
        return entries

    # ── Memory ───────────────────────────────────────────────────────────

    async def create_memory(
        self, model_a: str, model_b: str, experiment_id: str, summary: str
    ) -> None:
        """Persist a memory entry for a model pair after an experiment completes."""
        pair = sorted([model_a, model_b])
        now = datetime.now(timezone.utc).isoformat()
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO model_memory (model_a, model_b, experiment_id, summary, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (pair[0], pair[1], experiment_id, summary, now),
            )
            await self.db.commit()

    async def get_memories_for_pair(
        self, model_a: str, model_b: str, limit: int = 5
    ) -> list[dict]:
        """Fetch recent memories for a model pair, newest first."""
        pair = sorted([model_a, model_b])
        cursor = await self.db.execute(
            """SELECT * FROM model_memory
               WHERE model_a = ? AND model_b = ?
               ORDER BY created_at DESC LIMIT ?""",
            (pair[0], pair[1], limit),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def generate_memory_summary(self, experiment_id: str) -> str:
        """Build a concise memory string from an experiment's vocab + preset.

        Format: '<preset>, <N> rounds: coined: word1 (meaning), word2, ...'
        Returns empty string if the experiment is missing or had no vocab.
        """
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return ""
        vocab = await self.get_vocabulary(experiment_id)
        preset = exp.get("preset") or "custom"
        rounds_done = exp.get("rounds_completed") or 0
        if not vocab:
            return f"{preset}, {rounds_done} rounds (no vocab coined)"
        words = vocab[:8]
        word_parts: list[str] = []
        for w in words:
            meaning = w.get("meaning") or ""
            if meaning:
                word_parts.append(f'{w["word"]} ({meaning[:25]})')
            else:
                word_parts.append(w["word"])
        return f'{preset}, {rounds_done} rounds: coined: {", ".join(word_parts)}'

    async def get_model_radar_stats(self, experiment_id: str) -> list[dict]:
        """Compute radar chart axes for both models in one experiment.

        Returns raw values normalized to 0-1 relative to each other.
        """
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return []

        cursor = await self.db.execute(
            """SELECT model, latency_seconds, token_count, round
               FROM turns WHERE experiment_id = ? ORDER BY round, id""",
            (experiment_id,),
        )
        turn_rows = await cursor.fetchall()

        cursor = await self.db.execute(
            """SELECT coined_by, COUNT(*) as count
               FROM vocabulary WHERE experiment_id = ?
               GROUP BY coined_by""",
            (experiment_id,),
        )
        vocab_rows = await cursor.fetchall()
        vocab_by_speaker = {r["coined_by"]: r["count"] for r in vocab_rows}

        from server.config import get_display_name

        model_stats: dict[str, dict] = {}
        for model_str in [exp["model_a"], exp["model_b"]]:
            model_stats[model_str] = {
                "latencies": [],
                "token_counts": [],
                "rounds_tokens": {},
                "vocab_coined": vocab_by_speaker.get(get_display_name(model_str), 0),
            }

        for row in turn_rows:
            ms = row["model"]
            if ms not in model_stats:
                continue
            if row["latency_seconds"]:
                model_stats[ms]["latencies"].append(row["latency_seconds"])
            if row["token_count"]:
                model_stats[ms]["token_counts"].append(row["token_count"])
                r = row["round"]
                model_stats[ms]["rounds_tokens"].setdefault(r, []).append(row["token_count"])

        entries = []
        for model_str, ms in model_stats.items():
            lats = ms["latencies"]
            toks = ms["token_counts"]
            avg_lat = sum(lats) / len(lats) if lats else None
            avg_tok = sum(toks) / len(toks) if toks else None

            verbosity_raw = avg_tok or 0
            speed_raw = (1.0 / avg_lat) if avg_lat and avg_lat > 0 else 0
            creativity_raw = ms["vocab_coined"]

            if len(lats) >= 2:
                mean_lat = sum(lats) / len(lats)
                variance = sum((x - mean_lat) ** 2 for x in lats) / len(lats)
                consistency_raw = 1.0 / (math.sqrt(variance) + 0.01)
            else:
                # Single data point = no variance = perfectly consistent
                consistency_raw = 1.0 / 0.01

            rt = ms["rounds_tokens"]
            if len(rt) >= 2:
                rounds_sorted = sorted(rt.keys())
                avgs = [sum(rt[r]) / len(rt[r]) for r in rounds_sorted]
                n = len(avgs)
                x_mean = sum(rounds_sorted) / n
                y_mean = sum(avgs) / n
                numer = sum((x - x_mean) * (y - y_mean) for x, y in zip(rounds_sorted, avgs))
                denom = sum((x - x_mean) ** 2 for x in rounds_sorted)
                engagement_raw = numer / denom if denom > 0 else 0
            else:
                engagement_raw = 0

            entries.append({
                "model": model_str,
                "display_name": get_display_name(model_str),
                "verbosity_raw": verbosity_raw,
                "speed_raw": speed_raw,
                "creativity_raw": creativity_raw,
                "consistency_raw": consistency_raw,
                "engagement_raw": engagement_raw,
            })

        # Normalize to 0-1
        for axis in ["verbosity", "speed", "creativity", "consistency", "engagement"]:
            raw_key = f"{axis}_raw"
            values = [e[raw_key] for e in entries]
            max_val = max(values) if values else 1
            min_val = min(values) if values else 0
            if max_val == min_val:
                # Both models identical on this axis — assign uniform score
                for e in entries:
                    e[axis] = 1.0
                    del e[raw_key]
            else:
                span = max_val - min_val
                for e in entries:
                    e[axis] = round((e[raw_key] - min_val) / span, 3)
                    del e[raw_key]

        return entries
