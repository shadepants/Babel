&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-28 (session 31 &mdash; verify + push; live Playwright automation)

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
- [x] **Feature 4: Collaboration Chemistry Card** &mdash; `chemistry_engine.py` computes initiative balance, influence flow, convergence rate, surprise index; POST-completion bg task; `GET /api/experiments/{id}/chemistry`; `ChemistryCard.tsx` in Analytics
- [x] **Feature 5: Model Pairing Oracle** &mdash; `GET /api/experiments/pairing-oracle?preset=` aggregates chemistry per sorted model pair; `PairingOracle.tsx` in Configure with Apply button
- [x] **Feature 3: Echo Chamber Detector** &mdash; per-turn Jaccard similarity in relay_engine; `relay.signal_echo` + `relay.signal_intervention` SSE events; `EchoChamberWarning.tsx` amber HUD; auto-intervention system message injection
- [x] **Feature 6: Recursive Adversarial Mode** &mdash; hidden goal injection per agent in `build_messages()`; `relay.agenda_revealed` SSE at revelation round; `AgendaRevealOverlay.tsx` full-screen card-flip reveal; adversarial verdict (3-dimension scoring)
- [x] **Feature 2: Linguistic Evolution Tree** &mdash; `vocabulary_seed_id` in RelayStartRequest; seed words injected into system prompt; `GET /api/experiments/{id}/evolution-tree`; Dictionary 5th tab 'evolution' renders chain
- [x] **Feature 1: Recursive Audit Loop** &mdash; `audit_engine.py` fetches transcript, launches `start_relay(mode='audit')`; `enable_audit` flag; `relay.audit_started` SSE; `GET /api/experiments/{id}/audit`; Theater audit banner
- [x] **Multi-skill accessibility + pattern audit** &mdash; AgendaRevealOverlay focus trap + Esc; EchoChamberWarning keyboard dismiss; Theater textarea aria-label; `transition: all` anti-pattern fix; `prefers-reduced-motion` block; relay.py dead code cleanup

### Session 29 - E2E Testing (SHIPPED `725c64a`)
- [x] **Bug fix:** `Analytics.tsx:74` &mdash; `radarRes.models` null-deref crash for RPG experiments; added null guard
- [x] **E2E spec:** `ui/e2e/features-1-6.spec.ts` &mdash; 12 tests covering all 6 session 27-28 features
- [x] **E2E spec:** `ui/e2e/smoke-live.spec.ts` &mdash; 2 self-provisioning tests (verdict panel + SSE reconnect)

### Session 30 - Bug Fixes + Insights Synthesis (SHIPPED `317ea25`)
- [x] **Gallery CHM chip** &mdash; LEFT JOIN collaboration_metrics; `chm_score` chip on completed experiment rows (teal, `CHM 0.72`)
- [x] **fix(theater):** `agents_config_json` NULL for 2-agent experiments &mdash; Theater showed 0 turns. Fixed in relay.py.
- [x] **smoke-live.spec.ts** &mdash; fixed SSE `networkidle` timeout, `max_tokens` minimum (100), `data-testid="turn-bubble"` selector
- [x] **Insights synthesis** &mdash; 6 CLAUDE.md improvements

### Session 31 - Verify + Push + Live Playwright Automation (SHIPPED `bbe175b`)
- [x] Full test suite: tsc 0 errors, features-1-6 12/12, smoke 4/2-skipped
- [x] Opus 4.6 review: SAFE TO PUSH; pushed sessions 29-30 commits (`0f82fac..317ea25`)
- [x] `ui/e2e/live-features.spec.ts` &mdash; 4 live self-provisioning tests covering F1+F4, F3, F6, A2; all 4 pass (37.8s)
- [x] `ui/e2e/rpg-campaign.spec.ts` &mdash; fixed stale selector `.animate-fade-in.py-2` &rarr; `.animate-fade-in.py-5, .animate-fade-in.py-3`
- [!] GitHub Dependabot: 1 high vulnerability &mdash; check `github.com/shadepants/Babel/security`

### Next
- [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard (needs Deepseek API key)
- [ ] Entity snapshot quality check &mdash; after RPG session completes, verify `entity_snapshots` table populated
- [ ] Investigate Dependabot high-severity vulnerability
- [ ] F6 agendas 404 &mdash; `revelation_round=1` returned 404 from `/agendas`; investigate whether hidden_goals are stored correctly for 2-agent experiments

## 4. Architecture (v28.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    audit_engine.py       run_audit(): transcript -> new relay experiment (mode='audit') [session 28]
    chemistry_engine.py   compute_chemistry(): 4 metrics -> collaboration_metrics table [session 28]
    summarizer_engine.py  Layered context + generate_entity_snapshot()
    relay_engine.py       echo chamber check bg task; hidden goal injection in build_messages() [session 28]
    rpg_engine.py         cancel-race pattern; 5-min human timeout; entity snapshot at session end
    config.py             COMPANION_SYSTEM_PROMPT, CLASS_ACTION_TEMPLATES, narrator guard
    db.py                 collaboration_metrics table; evolution-tree walk; audit_experiment_id FK [session 28]
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull
    routers/relay.py      enable_audit, enable_echo_detector, hidden_goals, vocabulary_seed_id params [session 28]
    routers/experiments.py /chemistry, /audit, /evolution-tree, /agendas, /pairing-oracle endpoints [session 28]
  ui/src/
    lib/
      format.ts           modelDisplayName() exported here
      modelProvider.ts    getProvider(model) -> Provider enum
    components/common/
      ProviderSigil.tsx   16x16 SVG stroke glyph per AI provider family
    components/theater/
      AgendaRevealOverlay.tsx  Full-screen agenda reveal with focus trap [session 28]
      EchoChamberWarning.tsx   Amber HUD similarity meter [session 28]
      RPGTheater.tsx      DM turns: animate-fade-in.py-5 | companion turns: animate-fade-in.py-3
      DiceOverlay.tsx     Cinematic full-screen dice event
      SpriteAvatar.tsx    winner sparkle + loser fragments
    components/analytics/
      ChemistryCard.tsx   BarSplit + MetricGauge components [session 28]
    components/configure/
      PairingOracle.tsx   Ranked model pairing cards with Apply button [session 28]
    pages/
      Gallery.tsx         audit/rpg/inherited/adversarial mode badges + CHM chip [session 30]
      Dictionary.tsx      5th evolution tab with seed chain visualization [session 28]
      Configure.tsx       adversarial + echo + vocabulary seed + oracle sections [session 28]
      Analytics.tsx       Chemistry section + adversarial verdict display [session 28]
  ui/e2e/
    smoke.spec.ts         6 smoke checks; 2 skipped (replaced by smoke-live)
    smoke-live.spec.ts    2 self-provisioning: verdict panel + SSE reconnect [session 29]
    features-1-6.spec.ts  12 tests for session 27-28 features [session 29]
    live-features.spec.ts 4 live tests: F1+F4+F3+F6+A2 with real LLM calls [session 31]
    rpg-campaign.spec.ts  Full 4-round RPG campaign E2E (run manually) [selector fixed s31]
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
- **Playwright `text=// label`:** Playwright treats `//` as regex delimiters &mdash; use `.neural-section-label:has-text("label")` instead.
- **React Strict Mode double-fetch:** `/api/presets` fires twice in dev &mdash; Strict Mode behavior, not a bug.
- **`hidden_goals` schema:** `list[dict]` with `{agent_index: int, goal: str}` &mdash; NOT `list[str]` (422 validation error).
- **RPG Theater turn selectors:** DM turns `.animate-fade-in.py-5` | companion/NPC turns `.animate-fade-in.py-3` (not py-2).
- **Adversarial mode:** hidden goals ONLY injected for the correct `agent_index`; other agents never see them.
