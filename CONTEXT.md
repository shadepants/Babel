&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-01 (session 32 &mdash; entity snapshot fix, Dependabot, F6 agendas 404)

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

### Sessions 20-26 (SHIPPED)
See `docs/CHANGELOG.md` &mdash; RPG Hub, visual assets, AI vs AI Observatory, campaign memory, dev tooling, full frontend audit (17 fixes).

### Sessions 27-28 - Six-Feature Expansion (SHIPPED `97f5c8c`)
- [x] Feature 4: Collaboration Chemistry Card, Feature 5: Pairing Oracle, Feature 3: Echo Chamber Detector
- [x] Feature 6: Recursive Adversarial Mode, Feature 2: Linguistic Evolution Tree, Feature 1: Recursive Audit Loop
- [x] Multi-skill accessibility + pattern audit

### Session 29 - E2E Testing (SHIPPED `725c64a`)
- [x] Analytics null-guard fix; `features-1-6.spec.ts` 12 tests; `smoke-live.spec.ts` 2 self-provisioning tests

### Session 30 - Bug Fixes + Insights Synthesis (SHIPPED `317ea25`)
- [x] Gallery CHM chip; Theater agents_config_json NULL fix; smoke-live selector fixes; 6 CLAUDE.md improvements

### Session 31 - Live Playwright Automation (SHIPPED `d1e8fa0`)
- [x] Opus 4.6 verify + push sessions 29-30; `live-features.spec.ts` 4 live tests (F1+F4, F3, F6, A2) all pass
- [x] `rpg-campaign.spec.ts` stale selector fix (`.animate-fade-in.py-2` &rarr; `.py-5, .py-3`)
- [x] **A3: P11 regression** &mdash; `p11-regression.spec.ts`: Deepseek DM + non-Groq party, phantom NPC guard HELD, P11 CLOSED in `deferred-patterns.md`

### Session 32 - Bug Fixes: Entity Snapshot + Security + F6 Agendas (SHIPPED `8bdbc41`)
- [x] **Entity snapshot fix** &mdash; `max_tokens=800` silently truncated JSON; `json.loads` threw `JSONDecodeError` caught by bare except &rarr; always returned None. Fixed: `800 &rarr; 2000` + `finish_reason='length'` warning in `summarizer_engine.py`
- [x] **Dependabot CVE-2026-27606** &mdash; rollup 4.58 &rarr; 4.59 (arbitrary file write); minimatch ReDoS also fixed. 0 vulnerabilities.
- [x] **F6 `/agendas` 404** &mdash; `hidden_goals_json` never persisted to DB on experiment creation. Fixed: `db.create_experiment` now accepts `hidden_goals` param + INSERT; `relay.py` passes `body.hidden_goals`. F6 live test asserts `toBe(200)`, passes in 11.8s.

### Next
- [ ] No known blockers. All sessions 31-32 items resolved.
- [ ] Consider: Dependabot alert auto-dismissal (GitHub re-scans asynchronously after push)
- [ ] Consider: stress test entity snapshots in a fresh RPG run to confirm fix end-to-end

## 4. Architecture (v28.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    audit_engine.py       run_audit(): transcript -> new relay experiment (mode='audit') [session 28]
    chemistry_engine.py   compute_chemistry(): 4 metrics -> collaboration_metrics table [session 28]
    summarizer_engine.py  Layered context + generate_entity_snapshot() [max_tokens=2000, s32 fix]
    relay_engine.py       echo chamber check bg task; hidden goal injection in build_messages() [session 28]
    rpg_engine.py         cancel-race pattern; 5-min human timeout; entity snapshot at session end
    config.py             COMPANION_SYSTEM_PROMPT, CLASS_ACTION_TEMPLATES, narrator guard
    db.py                 create_experiment now accepts hidden_goals param [s32 fix]
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull
    routers/relay.py      passes hidden_goals to create_experiment [s32 fix]
    routers/experiments.py /chemistry, /audit, /evolution-tree, /agendas, /pairing-oracle endpoints [session 28]
  ui/src/
    components/theater/
      RPGTheater.tsx      DM turns: animate-fade-in.py-5 | companion turns: animate-fade-in.py-3
  ui/e2e/
    smoke.spec.ts         6 smoke checks; 2 skipped (replaced by smoke-live)
    smoke-live.spec.ts    2 self-provisioning: verdict panel + SSE reconnect [session 29]
    features-1-6.spec.ts  12 tests for session 27-28 features [session 29]
    live-features.spec.ts 4 live tests: F1+F4+F3+F6+A2 with real LLM calls [s31; F6 200 assert s32]
    rpg-campaign.spec.ts  Full 4-round RPG campaign E2E (run manually) [selector fixed s31]
    p11-regression.spec.ts P11 phantom NPC guard regression [session 31]
  gameplay-observations/
    deferred-patterns.md  P11 CLOSED (narrator guard confirmed 2026-03-01)
    confirmed-patterns.md confirmed patterns 3+ observations
  .claude/launch.json     preview_start configs: backend (:8000) + frontend (:5173)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes. `/pairing-oracle` is BEFORE `/{experiment_id}`.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **`start-run.cmd`:** no hot-reload; use for long RPG campaigns to avoid WatchFiles reload killing sessions.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card.
- **React hook order:** ALL hooks BEFORE any conditional early return (Rules of Hooks).
- **`hidden_goals` schema:** `list[dict]` with `{agent_index: int, goal: str}` &mdash; NOT `list[str]` (422 validation error).
- **RPG Theater turn selectors:** DM turns `.animate-fade-in.py-5` | companion/NPC turns `.animate-fade-in.py-3` (not py-2).
- **Entity snapshot max_tokens:** 2000 (was 800; 800 silently truncated JSON causing all snapshots to fail).
- **Adversarial mode:** hidden goals ONLY injected for the correct `agent_index`; other agents never see them.
