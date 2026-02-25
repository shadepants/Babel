# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-25 (session 18 complete &mdash; RPG reliability hardening shipped)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers)
- **Real-time:** Server-Sent Events (SSE) with persistence via `system_events`
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4
- **Database:** SQLite (WAL mode) with async background writer queue
- **Testing:** Playwright E2E (rpg-campaign.spec.ts)

## 3. Current State

### Phase 17 - Context &amp; Resiliency (SHIPPED)
- [x] Layered Context (Frozen/Cold/Hot), Asymmetric Fog of War, Persistent SSE Buffer
- [x] RPG Session Recovery via `rpg_state`, Background DB Writer Queue
- [x] Visual Dice, End-Session Modal, SpriteAvatar useId() guard
- See `docs/CHANGELOG.md` for full phase history.

### Session 18 - RPG Reliability Hardening (SHIPPED)
- [x] **`summarizer_engine.py` syntax fix** &mdash; literal newlines in string literals caused server-wide SyntaxError on startup; repaired and committed (`bdc9602`)
- [x] **`start.cmd`** &mdash; added `--reload-dir server` (WatchFiles only watches `server/`); added data-dir excludes
- [x] **`start-run.cmd`** &mdash; new no-reload launcher for 15+ round RPG sessions
- [x] **`server/app.py` shutdown drain** &mdash; replaced blind `asyncio.sleep(30)` with `asyncio.wait()` task drain + force-cancel escalation; DB only closes after all tasks settle
- [x] **`server/rpg_engine.py` DB-safe cancel** &mdash; CancelledError handler wrapped in `try/except RuntimeError`; `rpg_state` preserved on forced cancel for recovery
- [x] **`server/rpg_engine.py` cancel race** &mdash; `call_model` wrapped in `create_task` raced against `cancel_event`; shutdown interrupts mid-LLM call immediately

### Next: Reliability Tier 2 (planned)
- [ ] `verify_backend.cmd` &mdash; `compileall server` + `import server.app` smoke test
- [ ] `call_model` retry classification &mdash; skip retries on 4xx; add jitter; hard `asyncio.wait_for` outer timeout
- [ ] Background task semaphore &mdash; bound concurrency for vocab/scoring/summary tasks
- [ ] Add `match_id` to `call_model` log warnings

## 4. Architecture (v18.0)
```
Babel/
  server/
    app.py                      Lifespan: task-drain shutdown, background_tasks tracking
    summarizer_engine.py        Phase 17: Condenses history, extracts entities
    relay_engine.py             call_model: retry + backoff + fallback (no retry classification yet)
    rpg_engine.py               cancel-race pattern, DB-safe cancel handler, rpg_state recovery
    db.py                       Non-blocking asyncio.Queue writer worker
    event_hub.py                serialize/hydrate; put_nowait + eject on QueueFull (slow-consumer safe)
  start.cmd                     Dev launcher (hot-reload, server/ only)
  start-run.cmd                 Long-run launcher (no reload, for RPG campaigns)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **Serena DOTALL warning:** `.*` in replace_content matches newlines and can consume entire file. Use literal mode or specific anchors.
- **DB writer queue:** `update_experiment_status` and all writes go through `_execute_queued`; calling after `db.close()` hangs (future never resolves) rather than raising.
- **`start-run.cmd`:** no hot-reload; use for long RPG campaigns to avoid WatchFiles reload killing sessions.
- **No CI yet:** no `.github/` directory; `verify_backend.cmd` is the planned local smoke-test gate.
