# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-27 (session 24 &mdash; campaign memory enrichment + launch.json)

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

### Session 20 - Phase 20 RPG Hub + Visual Assets (SHIPPED)
- [x] `RPGHub.tsx` &mdash; dedicated /rpg-hub page with category tabs + 19 campaign presets (`a7a2249`)
- [x] `Campaign.tsx` &mdash; campaign setup page (world/party/pacing) navigating from RPGHub
- [x] Role-specific system prompts (`COMPANION_SYSTEM_PROMPT`) + `CLASS_ACTION_TEMPLATES` (`a7a2249`)
- [x] `_generate_action_menu()` &mdash; async LLM action menu via SSE `relay.action_menu` event (`a7a2249`)
- [x] `GET /{match_id}/rpg-context` endpoint &mdash; exposes world_state for UI (`a7a2249`)
- [x] `WorldStatePanel` + `StorySoFarBanner` + campaign info sidebar in RPGTheater (`a7a2249`)
- [x] `TheaterCanvas` tone-reactive tint &mdash; starfield color shifts with rpgConfig.tone (`a7a2249`)
- [x] Avatar pulse ring &mdash; emerald `animate-ping` on human's turn (`a7a2249`)
- [x] SeedLab RPG card removed &mdash; RPG entry point is now /rpg-hub only
- [x] Campaign.tsx back links fixed &mdash; both point to /rpg-hub (not /configure/...)

### Sessions 21-22 - Design Audit + Visual Assets (SHIPPED `dd441c6`, `5139f85`)
- [x] Campaign.tsx TDZ crash fixed, design token cleanup, CampaignNavState interface
- [x] ProviderSigil.tsx + modelProvider.ts &mdash; 16x16 SVG glyphs per provider
- [x] SpriteAvatar winner sparkle + loser fragment burst (one-shot CSS)
- [x] Dropdown glassmorphism (select.tsx bg-bg-deep/90 backdrop-blur)

### Session 23 - AI vs AI Observatory + Audit Fixes (SHIPPED `21d290f`)
- [x] RPGTheater full overhaul &mdash; pivot to AI vs AI experiment view (companion palette, DMTurnEntry, CompanionTurnEntry, NarrativeArcBar, observer status bar)
- [x] DiceOverlay: cinematic upgrade &mdash; 224px card, 92px number, 1.2s/4s timing, crit labels
- [x] Narrator guard extended (config.py) &mdash; bracket overreach `[Name]:` inside DM narration
- [x] Human turn timeout (rpg_engine.py) &mdash; `asyncio.wait_for(timeout=300.0)`
- [x] DM model guard (Campaign.tsx) &mdash; `DM_BLOCKED_MODELS` hides `gemini-2.5-pro` + `groq/*`
- [x] relay.py: participant model validation; client.ts: Pydantic error detail surfacing

### Session 24 - Campaign Memory Enrichment + Dev Tooling (SHIPPED `3c98e2b`)
- [x] **A1 verified:** `DM_BLOCKED_MODELS` filter confirmed working at Campaign.tsx:344
- [x] **Entity snapshots feature** &mdash; LLM-generated chronicle at session end, injected at next session start:
  - `db.py`: `entity_snapshots` table + `save_entity_snapshot()` + `get_entity_snapshots_for_pair()`
  - `summarizer_engine.py`: `generate_entity_snapshot()` &mdash; gemini-2.5-flash, uses world_state + cold_summary + last 15 turns, returns `{npcs, locations, items, unresolved_threads, party_arcs}`
  - `rpg_engine.py`: `_save_entity_snapshot_bg()` fires at session end; prior snapshot injected as `PRIOR SESSION ENTITY CHRONICLE` in DM system prompt
- [x] `.claude/launch.json` &mdash; dev server configs for `preview_start` (backend + frontend)

### Next
- [ ] A2: Visual test &mdash; run pure-AI RPG session; verify companion colors, DM prose, companion cards
- [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard
- [ ] Entity snapshot quality check &mdash; after a session completes, verify `entity_snapshots` table has data and snapshot is injected into the next session's DM prompt

## 4. Architecture (v24.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    summarizer_engine.py  Layered context + generate_entity_snapshot() (session 24)
    relay_engine.py       call_model: 4xx skip, jitter, hard timeout; _BG_SEMAPHORE; observer track_task
    rpg_engine.py         cancel-race pattern; 5-min human timeout; entity snapshot at session end
    config.py             COMPANION_SYSTEM_PROMPT, CLASS_ACTION_TEMPLATES, narrator + bracket-overreach guard
    db.py                 Non-blocking asyncio.Queue writer; entity_snapshots table (session 24)
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull (slow-consumer safe)
    routers/relay.py      participant model validation on RPG start; rpg-context endpoint
  ui/src/
    lib/
      modelProvider.ts    getProvider(model) -> Provider enum
    components/common/
      ProviderSigil.tsx   16x16 SVG stroke glyph per AI provider family
    components/theater/
      RPGTheater.tsx      AI vs AI observatory: companion palette, DMTurnEntry, CompanionTurnEntry,
                          NarrativeArcBar, WorldStatePanel pulse, observer status bar
      DiceOverlay.tsx     Cinematic full-screen dice event (224px card, crit labels, spring anim)
      SpriteAvatar.tsx    winner sparkle diamonds + loser falling fragments (one-shot CSS)
    pages/
      RPGHub.tsx          Campaign preset browser (19 presets, 4 categories)
      Campaign.tsx        DM_BLOCKED_MODELS filter; setup form; back -> /rpg-hub
  .claude/launch.json     preview_start configs: backend (:8000) + frontend (:5173)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
```

## 5. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs (future never resolves).
- **`start-run.cmd`:** no hot-reload; use for long RPG campaigns to avoid WatchFiles reload killing sessions.
- **`verify_backend.cmd`:** run after every server-side change before starting the server.
- **CI scope:** E2E tests excluded from CI (need live servers + DB). Run locally with `npm run test:e2e`.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card or preset picker.
- **React hook order:** useState declarations must appear BEFORE any useEffect that references them (TDZ).
- **ProviderSigil color prop:** pass explicit rgba hex (amber `rgba(245,158,11,0.75)` for A, cyan `rgba(6,182,212,0.75)` for B) &mdash; defaults to `currentColor`.
- **Sprite animations one-shot:** `animation-iteration-count: 1` + `forwards` fill &mdash; they do NOT loop.
- **launch.json frontend:** uses `node vite.js <root-path>` pattern &mdash; passes ui/ as positional root arg so vite finds its own node_modules.
