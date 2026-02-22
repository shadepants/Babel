# Babel — Claude Code Instructions

@import CONTEXT.md

## Project-Specific Tools
- **Backend dev server:** `.venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000`
- **Run tests:** `.venv\Scripts\python.exe -m pytest tests/ -v`
- **Python path:** Use `.venv\Scripts\python.exe` (project venv), not system Python

## Key Architecture Decisions
- **SSE over WebSocket** — simpler, auto-reconnect, human intervention via POST endpoints
- **litellm direct calls** — no Factory wrappers, local retry with exponential backoff
- **EventHub in-memory pub/sub** — subscribers filter by match_id
- **SQLite WAL mode** — concurrent reads while relay writes

## File Map (Phase 1)
- `server/app.py` — FastAPI entry point, lifespan manages DB + EventHub
- `server/config.py` — defaults, model registry, env loading
- `server/db.py` — async SQLite with hardened schema (indexes, constraints, pragmas)
- `server/event_hub.py` — SSE pub/sub (standalone, no Factory dependency)
- `server/relay_engine.py` — core relay loop with RelayAgent, RelayEvent, retry
- `server/routers/relay.py` — POST /api/relay/start, GET /api/relay/stream (SSE + keepalive)
