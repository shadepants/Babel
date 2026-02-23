# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Gemini audit hardening — fix real DB contention and SSE reconnection gaps; correct Gemini's false positives

## Changes This Session

### Gemini Audit Fixes (all 5 backend files modified, uncommitted → now committed)
- [x] **server/db.py** — Added `asyncio.Lock` (`self._write_lock`); wrapped all 7 write methods (`create_experiment`, `update_experiment_status`, `delete_experiment`, `add_turn`, `upsert_word`, `create_tournament`, `update_tournament_status`, `update_tournament_match`) with `async with self._write_lock:` to prevent interleaved commits from concurrent vocab extraction tasks
- [x] **server/relay_engine.py** — Added `_log_task_exception` callback helper; attached to both `asyncio.create_task(_extract_and_publish_vocab(...))` calls so silently swallowed background task errors now surface in logs
- [x] **server/event_hub.py** — Added `event_id: int = 0` field to `SSEEvent` dataclass; added `_next_id` auto-increment counter to `EventHub`; added `last_event_id: int | None = None` param to `subscribe()` with selective history replay (skips events ≤ last_event_id)
- [x] **server/routers/relay.py** — Reads `Last-Event-ID` request header; emits `id: {event_id}\n` per SSE frame so browsers can reconnect and replay only missed events
- [x] **server/routers/tournaments.py** — Same Last-Event-ID + `id:` treatment as relay.py
- [x] **CONTEXT.md** — Updated: added Gemini audit hardening section, write lock and SSE event ID rules in "Don't Forget", updated Last Updated date

### Gemini False Positives (no changes needed — already correct)
- Finding 2 (zombie experiment): Already handled — `except Exception` at relay_engine.py:318 sets status='failed'; tournament_engine.py:154 also catches relay failures
- Finding 3 (vocab blocklist O(n)): Already a `frozenset` at vocab_extractor.py:83 — O(1) lookup; all regexes module-level compiled

### Priority/Complexity Review (research only, no code changes)
- Produced full matrix of all pending tasks (Task 001–005, Configure polish, Settings, comparison view)
- Recommended Sprint 1: Task 003 (per-participant temperature, 2–3h) + Configure page polish (2–3h)

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python imports | PASSED | `from server.db import Database; from server.event_hub import EventHub; from server.relay_engine import run_relay, _log_task_exception` all import cleanly |
| pytest | SKIPPED | No `tests/` directory exists in repo yet |
| DB write lock logic | REVIEWED | Lock initialized in `connect()` (not `__init__`) to avoid "lock used before connect" edge case |
| SSE id: fields | NOT BROWSER-TESTED | Requires running server + Network tab inspection |
| Last-Event-ID replay | NOT BROWSER-TESTED | Requires network disconnect/reconnect test during live experiment |

## Next Steps

1. [ ] **Sprint 1A — Task 003:** Per-participant temperature settings (2–3h, lowest effort, high value)
   - Add `temperature_a: float` and `temperature_b: float` columns to experiments table
   - Expose sliders in Configure page
   - Pass per-agent temp to litellm calls in relay_engine.py
2. [ ] **Sprint 1B — Configure page polish:** turn_delay slider (0–5s), preset filtering, cost estimate display (2–3h)
3. [ ] **Task 002:** Judge model configuration (4–6h) — prerequisite for Task 001
4. [ ] **Task 001:** Round-by-round scoring with judge model (8–10h) — depends on Task 002
5. [ ] **Task 005:** Conversation export (CSV/JSON) — low complexity (2–3h), good standalone sprint
6. [ ] **Browser smoke test** SSE event IDs: open Theater page → Network tab → confirm `id: 1`, `id: 2`, ... per event frame
7. [ ] **Browser smoke test** Last-Event-ID: disable network mid-experiment, re-enable → confirm only missed turns replay

## Architecture Notes for Next Agent
- `EventHub` is in-memory only — event IDs reset on server restart. This is intentional (experiments are transient).
- `_write_lock` is `None` until `db.connect()` is called. Write methods use `# type: ignore[union-attr]` to suppress the Optional type error. If you add new write methods, follow the same pattern.
- The `subscribe()` `last_event_id` param defaults to `None` for full history replay — existing callers that don't pass it get unchanged behavior.
- SSE routers parse `Last-Event-ID` header defensively: only used if it's a digit string, otherwise falls back to full replay.
