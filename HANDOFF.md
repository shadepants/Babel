# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-01
**Active Agent:** Claude Code
**Current Goal:** Multi-wave codebase refactor (Session 33) — Waves 1-4 complete, RelayConfig wiring deferred

## Changes This Session

### Wave 1 — Backend Quick Wins (committed f97acad)
- [x] `server/summarizer_engine.py` — replaced raw `db.db.execute()` with `_execute_queued()`, added JSON guard
- [x] `server/audit_engine.py` — removed dead `db.create_experiment()` call, added type hints
- [x] `ui/src/lib/color.ts` — extracted `hexToRgba()` from TurnBubble.tsx
- [x] `ui/src/lib/spriteStatus.ts` — extracted `spriteStatuses()` (deduplicated from Theater/Gallery/Analytics)
- [x] `ui/src/lib/exporters.ts` — extracted JSON/CSV/Markdown export functions from Analytics.tsx

### Wave 2 — Core Engine + Theater Hook Extraction (committed 16208ed)
- [x] `server/config.py` — added `RelayConfig` dataclass (26 fields, defined but wiring deferred)
- [x] `server/relay_engine.py` — removed inconsistent `max_retries=1` in score_turn/final_verdict/check_pressure_valve
- [x] `ui/src/hooks/useTheaterData.ts` — extracted 4-chain REST data loader from Theater.tsx
- [x] `ui/src/hooks/useColorBleed.ts` — extracted CSS variable / data-active-model DOM mutation

### Wave 3 — Router Extraction + Configure Split (committed 16208ed)
- [x] `server/routers/relay.py` — `start_relay()` 252 lines → 90-line thin dispatcher; extracted `_validate_and_resolve_agents()`, `_start_rpg_relay()`, `_start_standard_relay()`
- [x] `ui/src/api/types.ts` — added `AgentSlot` interface (exported, shared type)
- [x] `ui/src/pages/Configure.tsx` — 945 → 837 lines; agent slot JSX extracted
- [x] `ui/src/components/configure/AgentSlotsPanel.tsx` — new 184-line component (14-prop interface)

### Wave 4 — RPG Engine (committed 16208ed)
- [x] `server/config.py` — added `RPGConfig` dataclass (10 fields)
- [x] `server/rpg_engine.py` — `run_rpg_match()` signature: 15 params → 7 (RPGConfig + infrastructure)
- [x] `server/routers/relay.py` — both `run_rpg_match()` call sites updated to use RPGConfig

### Wave 5 — Gemini Pro Review
- [x] Gemini 2.5 Pro review: 4/5 PASS
- [ ] Issue 5 deferred: RelayConfig not yet wired into `run_relay()` (4 callers across 3 files)

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python compileall | PASSED | `python -m compileall server -q` — no errors |
| Python imports | PASSED | server.app, relay_engine, rpg_engine all import clean |
| TypeScript TSC | PASSED | `npx tsc --noEmit` — zero errors after AgentSlotsPanel extraction |
| Gemini code review | 4/5 PASS | Issue 5 (RelayConfig wiring) explicitly deferred |
| E2E smoke test | SKIPPED | No server restart this session; no functional behavior changed |

## Architecture Additions (Session 33)

```
server/
  config.py          + RelayConfig (26 fields, unwired), RPGConfig (10 fields, wired)
  routers/relay.py   + _validate_and_resolve_agents(), _start_rpg_relay(), _start_standard_relay()

ui/src/
  lib/
    color.ts          new — hexToRgba()
    spriteStatus.ts   new — spriteStatuses()
    exporters.ts      new — exportJSON/CSV/Markdown()
  hooks/
    useTheaterData.ts new — parallel REST loader for Theater page
    useColorBleed.ts  new — CSS variable DOM mutations
  components/configure/
    AgentSlotsPanel.tsx new — agent slot UI (14 props)
  api/types.ts        + AgentSlot interface

~/.claude/agents/
  babel-db-agent.md      new
  babel-relay-agent.md   new
  babel-frontend-agent.md new
  babel-ops-agent.md     new
```

## Deferred Items

| Item | Reason | Risk |
|------|--------|------|
| RelayConfig wiring into run_relay() | 4 callers: _start_standard_relay, relay.py recovery path, audit_engine.py, tournament_engine.py | Medium — tournament_engine.py not analyzed |
| db.py module split | 80+ callers need rewiring | High |
| api/types.ts split | Many import sites, needs TSC after | Medium |
| RPGTheater.tsx split | No test coverage, verify E2E first | Medium |

## Next Steps

1. [ ] **Task 003: Temperature sliders in Configure.tsx** — AgentSlotsPanel already extracted as prep; add `temperature` field UI, wire to relay start payload
2. [ ] **RelayConfig wiring** — dedicate a session: read tournament_engine.py, audit_engine.py call sites, then wire all 4 callers atomically
3. [ ] **Stress test entity snapshots** — run a fresh RPG match to confirm session 32 entity snapshot fix end-to-end
4. [ ] **E2E smoke run** — `npx playwright test ui/e2e/smoke.spec.ts` after next server restart
