&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-01 (session 33 &mdash; multi-wave codebase refactor)

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

### Phases 1-19 (SHIPPED)
See `docs/CHANGELOG.md` for full history through Phase 19 (reliability tier 2, CI).

### Sessions 20-32 (SHIPPED)
See `docs/CHANGELOG.md` &mdash; RPG Hub, visual assets, Observatory, chemistry/oracle/echo/adversarial/audit/evolution features, E2E automation, entity snapshot + security fixes.

### Session 33 &mdash; Multi-Wave Codebase Refactor (SHIPPED `16208ed`)
- [x] **Wave 1 backend:** `summarizer_engine.py` &mdash; 4 direct `db.db.execute()` &rarr; `_execute_queued()`, JSON parse guard; `audit_engine.py` &mdash; dead `create_experiment()` call removed, imports cleaned
- [x] **Wave 1 frontend:** Extract `hexToRgba` &rarr; `lib/color.ts`, sprite logic &rarr; `lib/spriteStatus.ts`, export handlers &rarr; `lib/exporters.ts`; update 5 import sites (`f97acad`)
- [x] **Wave 2:** `relay_engine.py` &mdash; remove `max_retries=1` from `score_turn()`, `final_verdict()`, `check_pressure_valve()` (restores 2-retry + fallback map); `config.py` &mdash; add `RelayConfig` dataclass (26 fields, wiring deferred)
- [x] **Wave 2:** `Theater.tsx` &mdash; extract `useTheaterData` hook (4 nested Promise.all chains) and `useColorBleed` hook into `ui/src/hooks/`
- [x] **Wave 3:** `routers/relay.py` &mdash; extract `_validate_and_resolve_agents()`, `_start_rpg_relay()`, `_start_standard_relay()`; `start_relay()` 252 &rarr; 90 lines
- [x] **Wave 3:** `Configure.tsx` 945 &rarr; 837 lines; extract `AgentSlotsPanel` component; move `AgentSlot` interface &rarr; `api/types.ts`
- [x] **Wave 4:** `config.py` &mdash; add `RPGConfig` dataclass (10 fields); `run_rpg_match()` 15 params &rarr; 7; both call sites wired in relay.py
- [x] **4 Claude Code subagent definitions** created in `~/.claude/agents/`: `babel-db-agent.md`, `babel-relay-agent.md`, `babel-frontend-agent.md`, `babel-ops-agent.md`
- [x] Gemini Pro code review: 4/5 PASS; SSE names, DB safety, Tailwind classes, RPGConfig all clean

### Next
- [ ] **RelayConfig wiring** (deferred): wire `RelayConfig` into `run_relay()` signature + update all 4 callers (`_start_standard_relay`, recovery path, `audit_engine.py`, `tournament_engine.py`) &mdash; dedicated session
- [ ] Task 003: Temperature sliders in Configure.tsx (pre-planned; `AgentSlotsPanel` already extracts the slot UI)
- [ ] Consider: stress test entity snapshots in a fresh RPG run to confirm s32 fix end-to-end

## 4. Architecture (v33.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    audit_engine.py       run_audit(): dead create_experiment() removed; imports cleaned [s33]
    chemistry_engine.py   compute_chemistry(): 4 metrics -> collaboration_metrics table [session 28]
    summarizer_engine.py  Layered context + generate_entity_snapshot() [_execute_queued s33, max_tokens=2000]
    relay_engine.py       max_retries=1 removed from judge calls; echo/hidden-goal injection [s33]
    rpg_engine.py         run_rpg_match(config: RPGConfig) [s33]; cancel-race; 5-min human timeout
    config.py             RelayConfig (26 fields, unwired), RPGConfig (10 fields, wired) [s33]
    db.py                 WAL mode; _execute_queued() is the ONLY safe write path
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull
    routers/relay.py      _validate_and_resolve_agents, _start_rpg_relay, _start_standard_relay [s33]
    routers/experiments.py /chemistry, /audit, /evolution-tree, /agendas, /pairing-oracle endpoints
  ui/src/
    lib/
      color.ts            hexToRgba() [s33]
      spriteStatus.ts     resolveSpritePair(), resolveWinnerIndex() [s33]
      exporters.ts        downloadExperimentJson/Csv, copyExperimentMarkdown [s33]
    hooks/
      useTheaterData.ts   REST data load on mount (experiment, turns, scores, vocab, verdict) [s33]
      useColorBleed.ts    CSS variable + data-active-model bleed effect [s33]
    components/
      configure/
        AgentSlotsPanel.tsx  N-way agent slot configurator (extracted from Configure.tsx) [s33]
        PairingOracle.tsx    Ranked pairing suggestions
      theater/
        RPGTheater.tsx    DM turns: animate-fade-in.py-5 | companion turns: animate-fade-in.py-3
    api/types.ts          AgentSlot interface added [s33]; AgentConfig, RPGConfig, all wire types
    pages/
      Configure.tsx       945 -> 837 lines; uses AgentSlotsPanel [s33]
      Theater.tsx         uses useTheaterData + useColorBleed hooks [s33]
  ui/e2e/
    smoke.spec.ts         6 smoke checks
    smoke-live.spec.ts    2 self-provisioning: verdict panel + SSE reconnect
    features-1-6.spec.ts  12 tests for session 27-28 features
    live-features.spec.ts 4 live tests: F1+F4+F3+F6+A2 with real LLM calls
    rpg-campaign.spec.ts  Full 4-round RPG campaign E2E (run manually)
    p11-regression.spec.ts P11 phantom NPC guard regression
  ~/.claude/agents/       babel-db-agent.md, babel-relay-agent.md,
                          babel-frontend-agent.md, babel-ops-agent.md [s33]
  .claude/launch.json     preview_start configs: backend (:8000) + frontend (:5173)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes. `/pairing-oracle` is BEFORE `/{experiment_id}`.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card.
- **React hook order:** ALL hooks BEFORE any conditional early return (Rules of Hooks).
- **`hidden_goals` schema:** `list[dict]` with `{agent_index: int, goal: str}` &mdash; NOT `list[str]` (422 validation error).
- **RPG Theater turn selectors:** DM turns `.animate-fade-in.py-5` | companion/NPC turns `.animate-fade-in.py-3`
- **Entity snapshot max_tokens:** 2000 (was 800; 800 silently truncated JSON).
- **Adversarial mode:** hidden goals ONLY injected for the correct `agent_index`.
- **RelayConfig:** defined in config.py but NOT wired into run_relay() yet &mdash; 4 callers need updating including tournament_engine.py.
- **RPGConfig:** fully wired &mdash; pass `config: RPGConfig` to `run_rpg_match()`; call sites in `_start_rpg_relay()` and recovery path.
- **Subagent definitions:** use `babel-db-agent`, `babel-relay-agent`, `babel-frontend-agent`, `babel-ops-agent` from `~/.claude/agents/` for future sub-tasks.
