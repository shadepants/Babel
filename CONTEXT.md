&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-01 (session 34 &mdash; feature audit + bug fixes)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers)
- **Real-time:** Server-Sent Events (SSE) with persistence via `system_events`
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4
- **Database:** SQLite (WAL mode) with async background writer queue
- **Testing:** Playwright E2E (smoke, smoke-live, features-1-6, live-features, rpg-campaign) &mdash; local only

## 3. Current State

### Phases 1-19 + Sessions 20-32 (SHIPPED)
See `docs/CHANGELOG.md` for full history.

### Session 33 &mdash; Multi-Wave Codebase Refactor (SHIPPED `16208ed`)
- [x] Wave 1: `summarizer_engine.py` DB safety fixes; `audit_engine.py` dead code removed
- [x] Wave 1: Extract `lib/color.ts`, `lib/spriteStatus.ts`, `lib/exporters.ts`
- [x] Wave 2: `relay_engine.py` max_retries fix; `config.py` `RelayConfig` dataclass (26 fields, wiring deferred)
- [x] Wave 2: `Theater.tsx` &rarr; `useTheaterData` + `useColorBleed` hooks
- [x] Wave 3: `routers/relay.py` 252 &rarr; 90 lines; extract 3 helpers
- [x] Wave 3: `Configure.tsx` 945 &rarr; 837 lines; extract `AgentSlotsPanel`
- [x] Wave 4: `RPGConfig` dataclass wired into `run_rpg_match()`
- [x] 4 Claude Code subagent definitions in `~/.claude/agents/`

### Session 34 &mdash; Audit + Bug Fixes (SHIPPED `fab4b14`)
- [x] **Tailwind fix** (`de30af7`): `tailwind.config.js` content paths use `import.meta.url` absolute paths &mdash; fixes app rendering when launched from repo root (107 &rarr; 704 CSS rules)
- [x] **Feature audit**: all 11 features sessions 23-32 correctly wired frontend &harr; backend
- [x] **Task 003**: confirmed pre-implemented (temperature sliders in `AgentSlotsPanel`, wired to relay)
- [x] `Settings.tsx`: Memory Bank duplicate React keys fixed (separator + `created_at` in key)
- [x] `types.ts` + `hooks.ts`: `HumanTimeoutEvent` type + `relay.human_timeout` SSE handler (sets `humanTimedOut` flag); `relay.chemistry_ready` no-op case added
- [x] `HumanInput.tsx`: shows AFK timeout notice when `humanTimedOut` is true

### Next
- [ ] **RelayConfig wiring** (deferred): `run_relay()` still takes 20+ individual params; wire `RelayConfig` into signature + update 4 callers (`_start_standard_relay`, recovery path, `audit_engine.py`, `tournament_engine.py`) &mdash; read `tournament_engine.py` first
- [ ] **E2E smoke run**: `npx playwright test ui/e2e/smoke.spec.ts` &mdash; not run since session 33 refactor
- [ ] **Stress-test entity snapshots**: fresh RPG run to confirm s32 `max_tokens` 800&rarr;2000 fix end-to-end

## 4. Architecture (v34.0)
```
server/
  config.py             RelayConfig (26 fields, UNWIRED), RPGConfig (10 fields, wired) [s33]
  relay_engine.py       judge max_retries fixed; echo/adversarial injection [s33]
  rpg_engine.py         run_rpg_match(config: RPGConfig); 5-min human AFK timeout [s33]
  routers/relay.py      _validate_and_resolve_agents, _start_rpg_relay, _start_standard_relay [s33]
ui/src/
  lib/                  color.ts, spriteStatus.ts, exporters.ts [s33]
  hooks/                useTheaterData.ts, useColorBleed.ts [s33]
  components/configure/ AgentSlotsPanel.tsx [s33]
  api/types.ts          HumanTimeoutEvent added [s34]; AgentSlot [s33]
  api/hooks.ts          humanTimedOut field; relay.human_timeout + relay.chemistry_ready cases [s34]
  components/theater/
    HumanInput.tsx      AFK timeout notice UI [s34]
    RPGTheater.tsx      passes humanTimedOut to HumanInput [s34]
  pages/
    Settings.tsx        Memory Bank key fix [s34]
  tailwind.config.js    content paths use import.meta.url (absolute) [s34]
~/.claude/agents/       babel-db-agent.md, babel-relay-agent.md, babel-frontend-agent.md, babel-ops-agent.md [s33]
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind content paths:** `tailwind.config.js` uses `import.meta.url` absolute paths &mdash; NEVER relative `./src/**` (resolves from `process.cwd()` = repo root when launched via preview tool).
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes. `/pairing-oracle` is BEFORE `/{experiment_id}`.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card.
- **React hook order:** ALL hooks BEFORE any conditional early return (Rules of Hooks).
- **`hidden_goals` schema:** `list[dict]` with `{agent_index: int, goal: str}` &mdash; NOT `list[str]`.
- **RPG Theater turn selectors:** DM turns `.animate-fade-in.py-5` | companion/NPC turns `.animate-fade-in.py-3`
- **RelayConfig:** defined in config.py but NOT wired into `run_relay()` yet &mdash; 4 callers need updating.
- **RPGConfig:** fully wired &mdash; pass `config: RPGConfig` to `run_rpg_match()`; call sites in `_start_rpg_relay()` and recovery path.
- **Subagent definitions:** use `babel-*-agent` from `~/.claude/agents/` for future sub-tasks.
