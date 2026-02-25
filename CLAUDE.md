# Babel — Claude Code Instructions

@import CONTEXT.md

## Dev Environment
- **Backend:** `.venv\Scripts\python.exe -m uvicorn server.app:app --reload --port 8000`
- **Frontend:** `cd ui && .\run_npm.cmd dev` (Vite on port 5173, proxies /api to 8000)
- **Both must be running** for any end-to-end work
- **Python:** Always use `.venv\Scripts\python.exe` (project venv), not system Python
- **Tests:** `.venv\Scripts\python.exe -m pytest tests/ -v` (backend); `cd ui && npx vitest` (frontend)
- **Type check:** `cd ui && npx tsc --noEmit` — run after any frontend changes

## Key Architecture Decisions
- **SSE over WebSocket** — simpler, auto-reconnect, human intervention via POST endpoints
- **litellm direct calls** — no Factory wrappers, local retry with exponential backoff
- **EventHub in-memory pub/sub** — subscribers filter by match_id; monotonic event IDs for reconnect replay
- **SQLite WAL mode** — concurrent reads while relay writes; asyncio.Lock wraps all writes
- **Idempotent migrations** — all ALTER TABLE in db.py uses try/except OperationalError pattern

## Git Conventions
- Conventional commits: `feat(phase-N):`, `fix(backend):`, `fix(ui):`, `docs:`, `feat(scoring):`, `feat(theater):`
- Phase commits bundle all files for that phase — they're large but atomic
- Cross-review pattern: Gemini CLI reviews produce `fix:` commits (e.g., "fix: harden SSE pipeline (Gemini review)")
- Always update CONTEXT.md + HANDOFF.md after meaningful work

## Critical Pitfalls
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files — double-encodes. Use `win_write` MCP tool. Use HTML entities in JSX for non-ASCII (`&mdash;` `&larr;` `&#9671;`).
- **Tailwind dynamic classes:** NEVER `text-${color}` or `grid-cols-${n}` — purged in production. Use inline `style={}` or explicit conditionals.
- **SVG clipPath IDs:** SpriteAvatar needs unique `instanceId` per instance to avoid collision.
- **D3 class names from model strings:** Sanitize with `.replace(/[^a-zA-Z0-9_-]/g, '_')`.
- **Orbitron font:** Has NO glyphs for Unicode geometric symbols — always use `font-symbol` class on symbol spans.
- **StarField:** Pure canvas — not tsParticles. `tintColor` prop accepts "R,G,B" string. AppInner reads route and passes tint.
- **Serena regex DOTALL:** `.*` in replace_content (DOTALL mode) matches newlines — can consume entire file. Use literal mode or specific anchors.

## Reference Docs
- `docs/CHANGELOG.md` — completed phases 1-16 history
- `docs/IMPLEMENTATION_NOTES.md` — detailed subsystem notes (SSE, scoring, sprites, RPG, forking, N-way, etc.)
