&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-27 (session 28 &mdash; six-feature expansion)

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

### Phases 1-19 (SHIPPED)
See `docs/CHANGELOG.md` for full history through Phase 19 (reliability tier 2, CI).

### Sessions 20-26 (SHIPPED)
See `docs/CHANGELOG.md` &mdash; RPG Hub, visual assets, AI vs AI Observatory, campaign memory, dev tooling, full frontend audit (17 fixes).

### Sessions 27-28 - Six-Feature Expansion (SHIPPED `97f5c8c`)
- [x] **Feature 4: Collaboration Chemistry Card** &mdash; `chemistry_engine.py` computes initiative balance, influence flow, convergence rate, surprise index; POST-completion bg task; `GET /api/experiments/{id}/chemistry`; `ChemistryCard.tsx` in Analytics
- [x] **Feature 5: Model Pairing Oracle** &mdash; `GET /api/pairing-oracle?preset=` aggregates chemistry per sorted model pair; `PairingOracle.tsx` in Configure with Apply button
- [x] **Feature 3: Echo Chamber Detector** &mdash; per-turn Jaccard similarity in relay_engine; `relay.signal_echo` + `relay.signal_intervention` SSE events; `EchoChamberWarning.tsx` amber HUD; auto-intervention system message injection
- [x] **Feature 6: Recursive Adversarial Mode** &mdash; hidden goal injection per agent in `build_messages()`; `relay.agenda_revealed` SSE at revelation round; `AgendaRevealOverlay.tsx` full-screen card-flip reveal; adversarial verdict (3-dimension scoring)
- [x] **Feature 2: Linguistic Evolution Tree** &mdash; `vocabulary_seed_id` in RelayStartRequest; seed words injected into system prompt; `GET /api/experiments/{id}/evolution-tree`; Dictionary 5th tab 'evolution' renders chain
- [x] **Feature 1: Recursive Audit Loop** &mdash; `audit_engine.py` fetches transcript, launches `start_relay(mode='audit')`; `enable_audit` flag; `relay.audit_started` SSE; `GET /api/experiments/{id}/audit`; Theater audit banner
- [x] **Multi-skill accessibility + pattern audit** &mdash; AgendaRevealOverlay focus trap + Esc; EchoChamberWarning keyboard dismiss; Theater textarea aria-label; `transition: all` anti-pattern fix; `prefers-reduced-motion` block; relay.py dead code cleanup

### Next
- [ ] A2: Visual test &mdash; run pure-AI RPG session; verify companion colors, DM prose, companion cards
- [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard
- [ ] Entity snapshot quality check &mdash; after session completes, verify `entity_snapshots` table populated
- [ ] End-to-end test of Features 1-6 with live backend (need to run server and test each feature)
- [ ] Gallery CHM chip &mdash; aggregate chemistry score `(initiative_balance + surprise_index) / 2` shown as `CHM 0.72` chip on completed experiment rows (noted in plan, not yet implemented)

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
      DiceOverlay.tsx     Cinematic full-screen dice event
      SpriteAvatar.tsx    winner sparkle + loser fragments
    components/analytics/
      ChemistryCard.tsx   BarSplit + MetricGauge components [session 28]
    components/configure/
      PairingOracle.tsx   Ranked model pairing cards with Apply button [session 28]
    pages/
      RPGHub.tsx          Campaign preset browser
      Campaign.tsx        DM_BLOCKED_MODELS filter
      Gallery.tsx         audit/rpg/inherited/adversarial mode badges [session 28]
      Dictionary.tsx      5th evolution tab with seed chain visualization [session 28]
      Configure.tsx       adversarial + echo + vocabulary seed + oracle sections [session 28]
      Analytics.tsx       Chemistry section + adversarial verdict display [session 28]
  .claude/launch.json     preview_start configs: backend (:8000) + frontend (:5173)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **`start-run.cmd`:** no hot-reload; use for long RPG campaigns to avoid WatchFiles reload killing sessions.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card.
- **React hook order:** ALL hooks BEFORE any conditional early return (Rules of Hooks).
- **TurnBubble accentColor:** pass hex string for agents 2+ (emerald `#10B981`, violet `#8B5CF6`).
- **Vite host binding:** `vite.config.ts` `host: '0.0.0.0'` &mdash; preview tool connects via 127.0.0.1 (IPv4).
- **Tailwind + preview_start CWD:** `postcss.config.js` must pass absolute tailwind config path via `import.meta.url`.
- **Chemistry + Oracle dependency:** Oracle requires chemistry data; run Feature 4 first (already shipped together).
- **Adversarial mode:** hidden goals ONLY injected for the correct `agent_index`; other agents never see them.
