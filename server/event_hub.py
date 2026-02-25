"""SSE Event Hub — broadcasts relay events to connected browser clients.

Adapted from Factory's core/event_hub.py with one rename:
  cycle_id → match_id (Babel's domain term for a relay experiment)

Architecture: SSE over WebSocket.
  SSE provides server→client push with browser-native auto-reconnection.
  Human intervention (pause, inject) uses standard REST POST endpoints.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import AsyncIterator

logger = logging.getLogger(__name__)


@dataclass
class SSEEvent:
    """A single event to be broadcast via SSE."""
    event_type: str
    payload: dict
    timestamp: float = 0.0
    match_id: str | None = None
    event_id: int = 0  # assigned by EventHub.publish(); used for Last-Event-ID resumption

    def __post_init__(self) -> None:
        if self.timestamp == 0.0:
            self.timestamp = time.time()
        if self.match_id is None:
            self.match_id = self.payload.get("match_id")

    def to_sse_data(self) -> str:
        """Serialize for SSE wire format."""
        return json.dumps({
            "type": self.event_type,
            "timestamp": self.timestamp,
            **self.payload,
        })


class EventHub:
    """In-memory pub/sub hub for SSE event broadcasting.

    Each connected SSE client gets its own asyncio.Queue.
    Events are pushed to all subscriber queues on publish().
    Subscribers can filter by match_id.
    """

    def __init__(self, max_history: int = 2000) -> None:
        self._subscribers: list[tuple[asyncio.Queue, str | None]] = []
        self._history: list[SSEEvent] = []
        self._max_history = max_history
        self._next_id: int = 1  # monotonically increasing SSE event counter

    def publish(self, event_type: str, payload: dict) -> None:
        """Broadcast an event to all matching subscribers."""
        event = SSEEvent(event_type=event_type, payload=payload)
        event.event_id = self._next_id
        self._next_id += 1

        # Keep in history for late-joining clients
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        # Push to subscriber queues
        dead: list[int] = []
        for i, (queue, match_filter) in enumerate(self._subscribers):
            if match_filter is not None and event.match_id != match_filter:
                continue
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                logger.error(
                    "SSE Subscriber ejected: Queue full (maxsize=%d). Client is too slow or disconnected.",
                    queue.maxsize
                )
                dead.append(i)

        for i in reversed(dead):
            self._subscribers.pop(i)

    async def subscribe(
        self,
        match_id: str | None = None,
        include_history: bool = True,
        last_event_id: int | None = None,
    ) -> AsyncIterator[SSEEvent]:
        """Subscribe to events as an async iterator."""
        # Fix #4: Increase queue size to handle bursty research sessions
        queue: asyncio.Queue[SSEEvent] = asyncio.Queue(maxsize=5000)
        sub_entry = (queue, match_id)
        self._subscribers.append(sub_entry)

        try:
            if include_history:
                for event in self._history:
                    if match_id is not None and event.match_id != match_id:
                        continue
                    if last_event_id is not None and event.event_id <= last_event_id:
                        continue
                    yield event

            while True:
                event = await queue.get()
                yield event
        finally:
            try:
                self._subscribers.remove(sub_entry)
            except ValueError:
                pass

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    def get_history(
        self, match_id: str | None = None, limit: int = 50,
    ) -> list[dict]:
        """Get recent events as dicts (for REST fallback)."""
        events = self._history
        if match_id is not None:
            events = [e for e in events if e.match_id == match_id]
        return [
            {"type": e.event_type, "timestamp": e.timestamp, **e.payload}
            for e in events[-limit:]
        ]

    def serialize(self, limit: int = 1000) -> list[dict]:
        """Convert history buffer to simple dicts for DB storage."""
        return [
            {
                "match_id": e.match_id,
                "event_type": e.event_type,
                "payload": json.dumps(e.payload),
                "timestamp": e.timestamp,
            }
            for e in self._history[-limit:]
        ]

    def hydrate(self, rows: list[dict]) -> None:
        """Populate buffer from DB records on startup."""
        self._history = []
        for row in rows:
            try:
                event = SSEEvent(
                    event_type=row["event_type"],
                    payload=json.loads(row["payload"]),
                    timestamp=row["timestamp"],
                    match_id=row["match_id"],
                )
                event.event_id = self._next_id
                self._next_id += 1
                self._history.append(event)
            except Exception as e:
                logger.warning("Failed to hydrate SSE event: %s", e)
