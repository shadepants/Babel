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

CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    personality TEXT NOT NULL DEFAULT '',
    backstory TEXT NOT NULL DEFAULT '',
    avatar_color TEXT NOT NULL DEFAULT '#F59E0B',
    created_at TEXT NOT NULL
);

-- Phase 17: Layered Context (Rolling Karp)
CREATE TABLE IF NOT EXISTS cold_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    through_round INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(match_id, through_round)
);

CREATE TABLE IF NOT EXISTS world_state (
    match_id TEXT PRIMARY KEY REFERENCES experiments(id) ON DELETE CASCADE,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Resiliency / SSE Buffer Persistence
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp REAL NOT NULL
);

-- RPG Session Recovery
CREATE TABLE IF NOT EXISTS rpg_state (
    match_id TEXT PRIMARY KEY REFERENCES experiments(id) ON DELETE CASCADE,
    current_round INTEGER NOT NULL,
    current_speaker_idx INTEGER NOT NULL,
    is_awaiting_human INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL
);

-- Session 24: Entity Snapshots (LLM-generated chronicles at session end)
CREATE TABLE IF NOT EXISTS entity_snapshots (
    match_id TEXT PRIMARY KEY REFERENCES experiments(id) ON DELETE CASCADE,
    dm_model TEXT NOT NULL,
    preset_key TEXT,
    snapshot_json TEXT NOT NULL,
    generated_at TEXT NOT NULL
);
"""


# ── Database Manager ────────────────────────────────────────────────────

class Database:
    """Async SQLite database with WAL mode and foreign key enforcement."""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None
        self._write_lock: asyncio.Lock | None = None
        self._queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

    async def connect(self) -> None:
        """Open the database connection and initialize schema."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._write_lock = asyncio.Lock()  # serializes concurrent write tasks
        self._db = await aiosqlite.connect(str(self.db_path))
        self._db.row_factory = aiosqlite.Row

        # Start background writer worker
        self._worker_task = asyncio.create_task(self._writer_worker())

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

        try:
            await self._db.execute(
                "ALTER TABLE experiments ADD COLUMN label TEXT"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        # Phase 13b: RPG mode columns
        for col, ddl in [
            ("mode", "TEXT DEFAULT 'standard'"),
            ("participants_json", "TEXT"),
        ]:
            try:
                await self._db.execute(
                    f"ALTER TABLE experiments ADD COLUMN {col} {ddl}"
                )
                await self._db.commit()
            except Exception:
                pass  # column already exists

        try:
            await self._db.execute(
                "ALTER TABLE turns ADD COLUMN metadata TEXT"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        # Phase 14-B: experiment forking lineage
        for col, ddl in [
            ("parent_experiment_id", "TEXT"),
            ("fork_at_round", "INTEGER"),
        ]:
            try:
                await self._db.execute(
                    f"ALTER TABLE experiments ADD COLUMN {col} {ddl}"
                )
                await self._db.commit()
            except Exception:
                pass  # column already exists

        # Phase 14-C: vocabulary cross-run provenance
        try:
            await self._db.execute(
                "ALTER TABLE vocabulary ADD COLUMN origin_experiment_id TEXT"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        # Phase 15-A: N-way agents config
        try:
            await self._db.execute(
                "ALTER TABLE experiments ADD COLUMN agents_config_json TEXT"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        # Phase 16: AI documentary cache
        try:
            await self._db.execute(
                "ALTER TABLE experiments ADD COLUMN documentary TEXT"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

        # Phase 17: asymmetric visibility (fog of war)
        try:
            await self._db.execute(
                "ALTER TABLE turns ADD COLUMN visibility_json TEXT DEFAULT '[]'"
            )
            await self._db.commit()
        except Exception:
            pass  # column already exists

    async def close(self) -> None:
        """Close the database connection."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        if self._db:
            await self._db.close()
            self._db = None

    async def _writer_worker(self):
        """Sequential background worker for all INSERT/UPDATE/DELETE operations."""
        while True:
            try:
                sql, params, future = await self._queue.get()
                try:
                    async with self._write_lock: # Still use lock for internal safety
                        cursor = await self.db.execute(sql, params)
                        await self.db.commit()
                        if future and not future.done():
                            future.set_result(cursor)
                except Exception as e:
                    if future and not future.done():
                        future.set_exception(e)
                    logger.error("DB Writer worker error on SQL [%s]: %s", sql, e)
                finally:
                    self._queue.task_done()
            except asyncio.CancelledError:
                break

    async def _execute_queued(self, sql: str, params: Any = ()) -> Any:
        """Queue a write operation and wait for its completion."""
        future = asyncio.get_running_loop().create_future()
        await self._queue.put((sql, params, future))
        return await future

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
        mode: str = "standard",
        participants_json: str | None = None,
        parent_experiment_id: str | None = None,
        fork_at_round: int | None = None,
        agents: list[dict] | None = None,
    ) -> str:
        """Create a new experiment and return its ID."""
        experiment_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        config_json = json.dumps(config) if config else None

        # Phase 15-A: N-way agents — populate legacy columns from first two agents
        agents_config_json: str | None = None
        if agents and len(agents) >= 2:
            agents_config_json = json.dumps(agents)
            model_a = agents[0]["model"]
            model_b = agents[1]["model"]
            temperature_a = agents[0].get("temperature", 0.7)
            temperature_b = agents[1].get("temperature", 0.7)

        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO experiments
                   (id, created_at, model_a, model_b, preset, seed,
                    system_prompt, rounds_planned, config_json,
                    temperature_a, temperature_b,
                    judge_model, enable_scoring, enable_verdict,
                    mode, participants_json,
                    parent_experiment_id, fork_at_round, agents_config_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (experiment_id, now, model_a, model_b, preset, seed,
                 system_prompt, rounds_planned, config_json,
                 temperature_a, temperature_b,
                 judge_model, int(enable_scoring), int(enable_verdict),
                 mode, participants_json,
                 parent_experiment_id, fork_at_round, agents_config_json),
            )
            await self.db.commit()
        return experiment_id

    def get_agents_for_experiment(self, row: dict) -> list[dict]:
        """Parse agents from agents_config_json, or build 2-agent list from legacy fields.

        Returns list of dicts with keys: model, temperature, name (optional).
        """
        agents_json = row.get("agents_config_json")
        if agents_json:
            try:
                return json.loads(agents_json)
            except Exception:
                pass
        # Legacy fallback: 2-agent list from model_a/model_b columns
        return [
            {"model": row["model_a"], "temperature": row.get("temperature_a", 0.7), "name": None},
            {"model": row["model_b"], "temperature": row.get("temperature_b", 0.7), "name": None},
        ]

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

        await self._execute_queued(
            f"UPDATE experiments SET {', '.join(parts)} WHERE id = ?",
            params,
        )

    async def save_verdict(
        self,
        experiment_id: str,
        winner: str,
        verdict_reasoning: str,
    ) -> None:
        """Persist the final verdict for an experiment."""
        await self._execute_queued(
            "UPDATE experiments SET winner = ?, verdict_reasoning = ? WHERE id = ?",
            (winner, verdict_reasoning, experiment_id),
        )

    async def delete_experiment(self, experiment_id: str) -> None:
        """Delete an experiment and all associated data (cascades via FK)."""
        await self._execute_queued("DELETE FROM experiments WHERE id = ?", (experiment_id,))

    async def set_label(self, experiment_id: str, label: str | None) -> None:
        """Set or clear a human-readable nickname for an experiment."""
        await self._execute_queued(
            "UPDATE experiments SET label = ? WHERE id = ?",
            (label, experiment_id),
        )

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
        visibility: list[str] | None = None,
    ) -> int:
        """Insert a conversation turn. Returns the turn ID."""
        now = datetime.now(timezone.utc).isoformat()
        visibility_json = json.dumps(visibility) if visibility else '[]'
        cursor = await self._execute_queued(
            """INSERT INTO turns
                (experiment_id, round, speaker, model, content,
                latency_seconds, token_count, visibility_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (experiment_id, round_num, speaker, model, content,
                latency_seconds, token_count, visibility_json, now),
        )
        return cursor.lastrowid

    async def get_turns(self, experiment_id: str) -> list[dict]:
        """Get all turns for an experiment, ordered by round and ID."""
        cursor = await self.db.execute(
            "SELECT * FROM turns WHERE experiment_id = ? ORDER BY round, id",
            (experiment_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def get_stale_running_sessions(self, min_age_minutes: int = 3) -> list[dict]:
        """Return experiments stuck in 'running' status older than min_age_minutes.
        Used on server startup to detect sessions that survived a crash.
        """
        query = """
            SELECT id, model_a, model_b, seed, system_prompt,
                   rounds_planned, rounds_completed, config_json
            FROM experiments
            WHERE status = 'running'
              AND created_at < datetime('now', ?)
            ORDER BY created_at ASC
        """
        interval = f"-{min_age_minutes} minutes"
        cursor = await self.db.execute(query, (interval,))
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def insert_turn_score(
        self,
        turn_id: int,
        creativity: float,
        coherence: float,
        engagement: float,
        novelty: float,
    ) -> None:
        """Persist scores for a single turn."""
        await self._execute_queued(
            """INSERT INTO turn_scores (turn_id, creativity, coherence, engagement, novelty)
                VALUES (?, ?, ?, ?, ?)""",
            (turn_id, creativity, coherence, engagement, novelty),
        )

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
        await self._execute_queued(
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

    async def tag_word_origins(
        self,
        experiment_id: str,
        parent_experiment_id: str,
    ) -> None:
        """Mark words in experiment_id that also exist in parent_experiment_id.

        For each word coined in the forked experiment that also appears in the
        parent, set origin_experiment_id to the parent's ID so the frontend
        can render an inheritance badge on WordCard.
        """
        # Fetch parent word set (case-insensitive)
        cursor = await self.db.execute(
            "SELECT LOWER(word) FROM vocabulary WHERE experiment_id = ?",
            (parent_experiment_id,),
        )
        parent_words = {row[0] for row in await cursor.fetchall()}
        if not parent_words:
            return

        await self._execute_queued(
            """UPDATE vocabulary
                SET origin_experiment_id = ?
                WHERE experiment_id = ?
                    AND LOWER(word) IN ({placeholders})
                    AND origin_experiment_id IS NULL""".format(
                placeholders=",".join("?" for _ in parent_words)
            ),
            (parent_experiment_id, experiment_id, *parent_words),
        )

    async def get_experiment_tree(self, root_id: str) -> dict | None:
        """Fetch all experiments in a fork lineage as a nested tree.

        Uses a recursive CTE to traverse parent -> children relationships.
        Returns a nested dict {id, ..., children: [...]} rooted at root_id,
        or None if root_id does not exist.
        """
        cursor = await self.db.execute(
            """WITH RECURSIVE tree AS (
                   SELECT id, parent_experiment_id, fork_at_round, label, status,
                          model_a, model_b, rounds_planned, rounds_completed,
                          created_at, preset
                   FROM experiments WHERE id = ?
                   UNION ALL
                   SELECT e.id, e.parent_experiment_id, e.fork_at_round, e.label, e.status,
                          e.model_a, e.model_b, e.rounds_planned, e.rounds_completed,
                          e.created_at, e.preset
                   FROM experiments e JOIN tree t ON e.parent_experiment_id = t.id
               )
               SELECT * FROM tree""",
            (root_id,),
        )
        rows = [dict(row) for row in await cursor.fetchall()]
        if not rows:
            return None

        # Build lookup map and attach children lists
        by_id: dict[str, dict] = {}
        for row in rows:
            row["children"] = []
            by_id[row["id"]] = row

        root: dict | None = None
        for row in rows:
            parent_id = row.get("parent_experiment_id")
            if parent_id and parent_id in by_id:
                by_id[parent_id]["children"].append(row)
            else:
                root = row

        return root

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

        await self._execute_queued(
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
            await self._execute_queued(
                """INSERT INTO tournament_matches
                    (tournament_id, model_a, model_b, match_order)
                    VALUES (?, ?, ?, ?)""",
                (tournament_id, model_a, model_b, order),
            )

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
        await self._execute_queued(
            f"UPDATE tournaments SET {', '.join(parts)} WHERE id = ?", params,
        )

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
        await self._execute_queued(
            f"UPDATE tournament_matches SET {', '.join(parts)} WHERE id = ?",
            params,
        )

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
        await self._execute_queued(
            """INSERT INTO model_memory (model_a, model_b, experiment_id, summary, created_at)
                VALUES (?, ?, ?, ?, ?)""",
            (pair[0], pair[1], experiment_id, summary, now),
        )

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

    async def list_all_memories(self) -> list[dict]:
        """Return all memory rows, newest first."""
        cursor = await self.db.execute(
            "SELECT model_a, model_b, summary, created_at FROM model_memory ORDER BY created_at DESC"
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def delete_memories_for_pair(self, model_a: str, model_b: str) -> int:
        """Delete all memory rows for a model pair. Returns rows deleted."""
        pair = sorted([model_a, model_b])
        await self._execute_queued(
            "DELETE FROM model_memory WHERE model_a = ? AND model_b = ?",
            (pair[0], pair[1]),
        )
        cursor = await self.db.execute("SELECT changes()")
        row = await cursor.fetchone()
        return row[0] if row else 0

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
                # Both models identical on this axis -- assign uniform score
                for e in entries:
                    e[axis] = 1.0
                    del e[raw_key]
            else:
                span = max_val - min_val
                for e in entries:
                    e[axis] = round((e[raw_key] - min_val) / span, 3)
                    del e[raw_key]

    # ── Personas ─────────────────────────────────────────────────────────

    async def create_persona(
        self,
        name: str,
        personality: str = "",
        backstory: str = "",
        avatar_color: str = "#F59E0B",
    ) -> str:
        """Create a new persona and return its ID."""
        persona_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                """INSERT INTO personas (id, name, personality, backstory, avatar_color, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (persona_id, name, personality, backstory, avatar_color, now),
            )
            await self.db.commit()
        return persona_id

    async def get_all_personas(self) -> list[dict]:
        """Return all personas ordered by creation date."""
        cursor = await self.db.execute(
            "SELECT * FROM personas ORDER BY created_at ASC"
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def get_persona(self, persona_id: str) -> dict | None:
        """Return a single persona by ID, or None if not found."""
        cursor = await self.db.execute(
            "SELECT * FROM personas WHERE id = ?", (persona_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_persona(self, persona_id: str, **kwargs: Any) -> None:
        """Update persona fields. Only known columns are allowed."""
        allowed = {"name", "personality", "backstory", "avatar_color"}
        fields = {k: v for k, v in kwargs.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [persona_id]
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute(
                f"UPDATE personas SET {set_clause} WHERE id = ?", values
            )
            await self.db.commit()

    async def delete_persona(self, persona_id: str) -> None:
        """Delete a persona by ID."""
        async with self._write_lock:  # type: ignore[union-attr]
            await self.db.execute("DELETE FROM personas WHERE id = ?", (persona_id,))
            await self.db.commit()

    # ── Documentary ──────────────────────────────────────────────────────

    async def save_documentary(self, experiment_id: str, text: str) -> None:
        """Cache the generated documentary text on the experiment row."""
        await self._execute_queued(
            "UPDATE experiments SET documentary = ? WHERE id = ?",
            (text, experiment_id),
        )

    async def get_documentary(self, experiment_id: str) -> str | None:
        """Return the cached documentary text, or None if not yet generated."""
        cursor = await self.db.execute(
            "SELECT documentary FROM experiments WHERE id = ?", (experiment_id,)
        )
        row = await cursor.fetchone()
        return row["documentary"] if row else None

    # ── RPG Memory ───────────────────────────────────────────────────────

    async def generate_rpg_memory_summary(self, experiment_id: str) -> str:
        """Build a compact RPG campaign memory string (no LLM call).

        Format: "Campaign 'preset', N rounds. Party: [roles].
        Key events: DM turn snippets. Coined: word1, word2..."
        Returns empty string if experiment missing.
        """
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return ""

        preset = exp.get("preset") or "custom"
        rounds_done = exp.get("rounds_completed") or 0

        # Party members from participants_json
        party_parts: list[str] = []
        participants_raw = exp.get("participants_json")
        if participants_raw:
            try:
                participants = json.loads(participants_raw)
                for p in participants:
                    role = p.get("role", "agent")
                    name = p.get("name") or p.get("model", "unknown")
                    party_parts.append(f"{name}({role})")
            except Exception:
                pass

        # Key events: first 60 chars of each DM/narrator turn
        cursor = await self.db.execute(
            """SELECT speaker, content FROM turns
               WHERE experiment_id = ? ORDER BY round, id""",
            (experiment_id,),
        )
        turn_rows = await cursor.fetchall()
        events: list[str] = []
        for row in turn_rows:
            if row["speaker"].lower() in ("dm", "narrator", "gm"):
                snippet = row["content"][:60].replace("\n", " ")
                events.append(snippet)
            if len(events) >= 4:
                break

        # Vocabulary
        vocab = await self.get_vocabulary(experiment_id)
        coined = [w["word"] for w in vocab[:6]]

        parts = [f"Campaign '{preset}', {rounds_done} rounds."]
        if party_parts:
            parts.append(f"Party: {', '.join(party_parts)}.")
        if events:
            parts.append(f"Key events: {'; '.join(events)}.")
        if coined:
            parts.append(f"Coined: {', '.join(coined)}.")

        summary = " ".join(parts)
        return summary[:500]

    # ── Resiliency (Phase 17) ──────────────────────────────────────────

    async def save_system_events(self, events: list[dict]) -> None:
        """Persist the EventHub buffer to disk."""
        await self._execute_queued("DELETE FROM system_events")
        for e in events:
            await self._execute_queued(
                """INSERT INTO system_events (match_id, event_type, payload, timestamp)
                    VALUES (?, ?, ?, ?)""",
                (e["match_id"], e["event_type"], e["payload"], e["timestamp"]),
            )

    async def get_system_events(self, limit: int = 1000) -> list[dict]:
        """Fetch persisted SSE events for hydration."""
        cursor = await self.db.execute(
            "SELECT * FROM system_events ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in reversed(rows)]

    async def save_rpg_state(
        self,
        match_id: str,
        current_round: int,
        current_speaker_idx: int,
        is_awaiting_human: bool,
    ) -> None:
        """Persist ephemeral RPG engine state."""
        now = datetime.now(timezone.utc).isoformat()
        await self._execute_queued(
            """INSERT INTO rpg_state
                (match_id, current_round, current_speaker_idx, is_awaiting_human, last_updated)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(match_id) DO UPDATE SET
                    current_round = excluded.current_round,
                    current_speaker_idx = excluded.current_speaker_idx,
                    is_awaiting_human = excluded.is_awaiting_human,
                    last_updated = excluded.last_updated""",
            (match_id, current_round, current_speaker_idx, int(is_awaiting_human), now),
        )

    async def get_rpg_state(self, match_id: str) -> dict | None:
        """Fetch persisted RPG state for recovery."""
        cursor = await self.db.execute(
            "SELECT * FROM rpg_state WHERE match_id = ?", (match_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def delete_rpg_state(self, match_id: str) -> None:
        """Clean up RPG state after completion or stop."""
        await self._execute_queued("DELETE FROM rpg_state WHERE match_id = ?", (match_id,))

    # ── Phase 17: Layered Context (Rolling Karp) ───────────────────────

    async def get_latest_cold_summary(self, match_id: str) -> str | None:
        """Fetch the most recent narrative recap for this match."""
        cursor = await self.db.execute(
            "SELECT summary FROM cold_summaries WHERE match_id = ? ORDER BY through_round DESC LIMIT 1",
            (match_id,),
        )
        row = await cursor.fetchone()
        return row["summary"] if row else None

    async def get_world_state(self, match_id: str) -> str | None:
        """Fetch the current extracted entity state (World Bible)."""
        cursor = await self.db.execute(
            "SELECT state_json FROM world_state WHERE match_id = ?",
            (match_id,),
        )
        row = await cursor.fetchone()
        return row["state_json"] if row else None

    # -- Entity Snapshots (Session 24) ----------------------------------------

    async def save_entity_snapshot(
        self, match_id: str, dm_model: str, preset_key: str | None, snapshot_json: str
    ) -> None:
        """Persist the LLM-generated entity chronicle for a completed RPG session."""
        now = datetime.now(timezone.utc).isoformat()
        await self._execute_queued(
            """INSERT INTO entity_snapshots
                (match_id, dm_model, preset_key, snapshot_json, generated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(match_id) DO UPDATE SET
                    snapshot_json = excluded.snapshot_json,
                    generated_at = excluded.generated_at""",
            (match_id, dm_model, preset_key, snapshot_json, now),
        )

    async def get_entity_snapshots_for_pair(
        self, dm_model: str, preset_key: str | None, limit: int = 2
    ) -> list[dict]:
        """Fetch recent entity snapshots for a (dm_model, preset_key) pair, newest first."""
        cursor = await self.db.execute(
            """SELECT match_id, snapshot_json, generated_at
               FROM entity_snapshots
               WHERE dm_model = ? AND (preset_key = ? OR (preset_key IS NULL AND ? IS NULL))
               ORDER BY generated_at DESC LIMIT ?""",
            (dm_model, preset_key, preset_key, limit),
        )
        return [dict(row) for row in await cursor.fetchall()]
