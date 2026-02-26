# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-26 (session 22 &mdash; design audit + model sigils + sprite burst + dropdown glassmorphism)

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

### Session 21 - Bug Fix (UNCOMMITTED)
- [x] Campaign.tsx TDZ crash fixed &mdash; `availableModels` useState moved before useEffect consumer
- [ ] **UNCOMMITTED** &mdash; SeedLab.tsx cleanup + Campaign.tsx (back links + TDZ fix)

### Session 22 - Design Audit + Visual Assets (UNCOMMITTED)
- [x] **Frontend design audit (P1-P3 fixes):**
  - `Campaign.tsx` &mdash; added `CampaignNavState` interface (removed `as any`), 4x `text-[11px]` &rarr; `text-xs`, aria-label on remove button, focus border opacity bump
  - `SeedLab.tsx` &mdash; 2x inline `style={{ position: 'relative' }}` &rarr; `className="relative"`
  - `RPGTheater.tsx` &mdash; 20+ hardcoded `slate-*` tokens &rarr; semantic (`text-text-primary`, `text-text-dim`, `bg-bg-deep`, `border-border-custom`)
  - `Analytics.tsx` &mdash; 5 section headings upgraded to `font-display text-xs font-bold tracking-wider uppercase`
  - `Gallery.tsx` &mdash; metadata row opacity bump (`/55` &rarr; `/70`) + glitch event on Refresh click
- [x] **Model identity sigils:**
  - NEW `ui/src/lib/modelProvider.ts` &mdash; `getProvider()` maps litellm prefix to provider enum
  - NEW `ui/src/components/common/ProviderSigil.tsx` &mdash; 16x16 SVG stroke glyphs per provider
  - `Gallery.tsx` &mdash; sigil before each model name (amber A, cyan B, size 13)
  - `Analytics.tsx` &mdash; sigil before each model name in h1 header (amber A, cyan B, size 14)
- [x] **Victory/defeat sprite burst:**
  - `SpriteAvatar.tsx` &mdash; 5 gold diamond polygons on winner, 3 falling rects on loser (below feet)
  - `index.css` &mdash; `sprite-spark` + `sprite-fragment` keyframes (one-shot, `forwards` fill)
- [x] **Dropdown glassmorphism fix:**
  - `ui/src/components/ui/select.tsx` &mdash; `bg-popover` (undefined, solid opaque) &rarr; `bg-bg-deep/90 backdrop-blur-md`; `focus:bg-accent` &rarr; `focus:bg-accent/20`; all shadcn foreground vars replaced with project tokens
- [x] `tsc --noEmit` clean &mdash; zero errors

### Next
- Commit all pending changes from sessions 21 + 22 (single combined commit or two atomic commits)
- Manual smoke test: Gallery sigils visible, Theater winner/loser burst plays once, dropdowns semi-transparent

## 4. Architecture (v22.0)
```
Babel/
  server/
    app.py                Lifespan: task-drain shutdown, background_tasks tracking
    summarizer_engine.py  Phase 17: Condenses history, extracts entities
    relay_engine.py       call_model: 4xx skip, jitter, hard timeout, match_id; _BG_SEMAPHORE; observer track_task
    rpg_engine.py         cancel-race pattern, DB-safe cancel handler, rpg_state recovery; action menu generation
    config.py             COMPANION_SYSTEM_PROMPT, CLASS_ACTION_TEMPLATES, narrator discipline guard
    db.py                 Non-blocking asyncio.Queue writer worker
    event_hub.py          serialize/hydrate; put_nowait + eject on QueueFull (slow-consumer safe)
    routers/relay.py      GET /{match_id}/rpg-context endpoint
  ui/src/
    lib/
      modelProvider.ts    getProvider(model) -> Provider enum (anthropic/openai/google/meta/mistral/xai/unknown)
    components/common/
      ProviderSigil.tsx   16x16 SVG stroke glyph per AI provider family
    components/theater/
      SpriteAvatar.tsx    winner sparkle diamonds + loser falling fragments (one-shot CSS animations)
    pages/
      RPGHub.tsx          Campaign preset browser (19 presets, 4 categories)
      Campaign.tsx        Campaign setup form; back button -> /rpg-hub
      Gallery.tsx         ProviderSigil before each model name; glitch on refresh
      Analytics.tsx       ProviderSigil before each model name in h1
    index.css             sprite-spark + sprite-fragment keyframes (appended)
  .github/workflows/ci.yml  Backend + frontend CI (push/PR to master)
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
- **TheaterCanvas tintColor:** accepts "R,G,B" string. toneToTint map lives in RPGTheater.tsx.
- **RPG entry point:** /rpg-hub only. SeedLab no longer has an RPG card or preset picker.
- **React hook order:** useState declarations must appear BEFORE any useEffect that references them (TDZ).
- **ProviderSigil color prop:** pass explicit rgba hex (amber `rgba(245,158,11,0.75)` for A, cyan `rgba(6,182,212,0.75)` for B) &mdash; defaults to `currentColor`.
- **Sprite animations one-shot:** `animation-iteration-count: 1` + `forwards` fill &mdash; they do NOT loop.
