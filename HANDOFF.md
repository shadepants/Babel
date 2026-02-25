# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-25 (Session 18 COMPLETE)
**Active Agent:** Claude Code
**Current Goal:** RPG reliability tier 2 (smoke test, retry classification, semaphore, observability)

---

## What Was Done This Session

### 1. Emergency fix: summarizer_engine.py syntax corruption
- Literal newlines embedded in double-quoted Python string literals caused
  `SyntaxError: unterminated string literal` on every import, killing the whole server.
- File was already repaired in working tree; two leftover fix scripts deleted.
- Committed as `bdc9602`, pushed to origin.

### 2. RPG reliability hardening (PR1 + PR2)

**PR1 -- `218c546`**
- `start.cmd`: added `--reload-dir server` + data-dir excludes -- WatchFiles no longer
  watches project root, eliminating hot-reload-kills-session failure mode.
- `start-run.cmd`: new no-reload launcher for 15+ round RPG campaigns.
- `server/app.py`: replaced `asyncio.sleep(30)` with `asyncio.wait()` drain + force-cancel
  escalation; `db.close()` only runs after all tasks have settled.
- `server/rpg_engine.py`: DB-safe CancelledError handler (`except RuntimeError`);
  `rpg_state` preserved on forced cancel to allow startup recovery.

**PR2 -- `62932a1`**
- `server/rpg_engine.py`: `call_model` wrapped in `create_task` raced against
  `cancel_event.wait()` via `asyncio.wait(FIRST_COMPLETED)`; shutdown now interrupts
  a running LLM call in <1s instead of waiting up to 186s.

### 3. Code review follow-up -- `8a0d20d`
- Narrowed `except Exception` to `except RuntimeError` in cancel cleanup (precise type).
- Added `try/finally` around `asyncio.wait()` so `_cw` is always cancelled and gathered
  (prevents "Task destroyed but pending" asyncio warnings).

---

## Verification Status

| Change | Status |
|--------|--------|
| summarizer_engine.py syntax | VERIFIED (py_compile clean) |
| start.cmd --reload-dir | Committed, logic verified by inspection |
| app.py shutdown drain | Committed, logic verified by inspection |
| rpg_engine.py cancel race | Committed, logic verified by inspection |
| All commits pushed | origin/master at `8a0d20d` |

---

## Next Steps (Reliability Tier 2)

Priority order (all small, can land in one PR):

1. **`verify_backend.cmd`** -- `python -m compileall server` + `python -c "import server.app"`
   -- prevents total downtime from syntax/import regressions (motivated by actual incident)

2. **`call_model` retry hardening** -- skip retries on 4xx (AuthenticationError, not-found);
   add jitter to backoff (`2**attempt + random.uniform(0, 1)`);
   wrap `litellm.acompletion` in `asyncio.wait_for(coro, timeout=agent.request_timeout + 5)`
   as hard outer bound

3. **Background task semaphore** -- `asyncio.Semaphore(8)` wrapping task body in
   vocab extraction, scoring, summaries -- prevents unbounded concurrency over long sessions

4. **`call_model` observability** -- add `match_id` param (optional) to log warnings
   so retry failures are attributable to a specific session

Items deferred:
- RPG recovery atomicity (turn + rpg_state atomic commit) -- low probability, defer
- GitHub Actions CI -- separate track, no .github/ yet
- EventHub slow-consumer policy -- ALREADY DONE (put_nowait + QueueFull eject)

---

## Key Files Modified This Session
- `server/app.py` -- shutdown block (lines 65-83)
- `server/rpg_engine.py` -- cancel race (lines 228-237), CancelledError handler (lines 338-344)
- `start.cmd` -- reload flags
- `start-run.cmd` -- new file
