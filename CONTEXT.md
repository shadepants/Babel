# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-26 (session 19 complete &mdash; CI shipped)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers)
- **Real-time:** Server-Sent Events (SSE) with persistence via `system_events`
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4
- **Database:** SQLite (WAL mode) with async background writer queue
- **Testing:** Playwright E2E (rpg-campaign.spec.ts, smoke.spec.ts) &mdash; local only

## 3. Current State

### Phases 1-17 (SHIPPED)
See `docs/CHANGELOG.md` for full history through Phase 17 (layered context, RPG resiliency, architectural hardening).

### Session 18 - RPG Reliability Hardening (SHIPPED)
- [x] `summarizer_engine.py` syntax fix (`bdc9602`)
- [x] `start.cmd` --reload-dir, `start-run.cmd` launcher
- [x] `app.py` shutdown drain (asyncio.wait + force-cancel)
- [x] `rpg_engine.py` cancel race + DB-safe CancelledError handler

### Session 19 - Reliability Tier 2 + CI (SHIPPED)
- [x] `verify_backend.cmd` &mdash; compileall + import smoke test (`e2fc07a`)
- [x] `call_model` retry hardening &mdash; 4xx skip, jitter, hard `asyncio.wait_for` timeout (`e2fc07a`)
- [x] Background task semaphore &mdash; `_BG_SEMAPHORE = asyncio.Semaphore(8)` (`e2fc07a`)
- [x] `match_id` in `call_model` log warnings (`e2fc07a`)
- [x] Observer task tracking &mdash; `track_task()` on `_obs` (`47fd580`)
- [x] GitHub Actions CI &mdash; backend syntax/import + frontend build/lint on push/PR (`a9cf113`)

### Next
- New feature work (TBD)

## 4. Architecture (v19.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    summarizer_engine.py  Phase 17: Condenses history, extracts entities
    relay_engine.py       call_model: 4xx skip, jitter, hard timeout, match_id; _BG_SEMAPHORE; observer track_task
    rpg_engine.py         cancel-race pattern, DB-safe cancel handler, rpg_state recovery
    db.py                 Non-blocking asyncio.Queue writer worker
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull (slow-consumer safe)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
  verify_backend.cmd      Local smoke test: compileall + import check
  start.cmd               Dev launcher (hot-reload, server/ only)
  start-run.cmd           Long-run launcher (no reload, for RPG campaigns)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **Serena DOTALL warning:** `.*` in replace_content matches newlines and can consume entire file. Use literal mode or specific anchors.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs (future never resolves).
- **`start-run.cmd`:** no hot-reload; use for long RPG campaigns to avoid WatchFiles reload killing sessions.
- **`verify_backend.cmd`:** run after every server-side change before starting the server.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
