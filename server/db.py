"""SQLite database for Babel experiments, turns, and vocabulary.

Uses aiosqlite for async access with WAL mode for concurrent reads
while the relay engine writes. All foreign keys are enforced.
"""

import aiosqlite
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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
    parent_words TEXT
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_experiment ON vocabulary(experiment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_unique
    ON vocabulary(experiment_id, word);
"""


# ── Database Manager ────────────────────────────────────────────────────

class Database:
    """Async SQLite database with WAL mode and foreign key enforcement."""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        """Open the database connection and initialize schema."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(str(self.db_path))
        self._db.row_factory = aiosqlite.Row

        # Hardening pragmas
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA foreign_keys=ON")
        await self._db.execute("PRAGMA synchronous=NORMAL")

        await self._db.executescript(_SCHEMA)
        await self._db.commit()

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
    ) -> str:
        """Create a new experiment and return its ID."""
        experiment_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        config_json = json.dumps(config) if config else None

        await self.db.execute(
            """INSERT INTO experiments
               (id, created_at, model_a, model_b, preset, seed,
                system_prompt, rounds_planned, config_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (experiment_id, now, model_a, model_b, preset, seed,
             system_prompt, rounds_planned, config_json),
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

    async def list_experiments(self, limit: int = 50) -> list[dict]:
        """List experiments, most recent first."""
        cursor = await self.db.execute(
            "SELECT * FROM experiments ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
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

        await self.db.execute(
            f"UPDATE experiments SET {', '.join(parts)} WHERE id = ?",
            params,
        )
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
    ) -> None:
        """Insert a vocabulary word or bump usage_count if it already exists.

        Uses SQLite's ON CONFLICT upsert for atomicity — a single query
        handles both creation and re-encounter counting.
        """
        parents_json = json.dumps(parent_words) if parent_words else None
        await self.db.execute(
            """INSERT INTO vocabulary
               (experiment_id, word, meaning, coined_by, coined_round,
                category, parent_words)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(experiment_id, word)
               DO UPDATE SET usage_count = usage_count + 1""",
            (experiment_id, word, meaning, coined_by, coined_round,
             category, parents_json),
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
