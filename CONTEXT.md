&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-27 (session 26 &mdash; frontend audit + 17 bug fixes)

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
- [x] **Entity snapshots feature** &mdash; LLM-generated chronicle at session end, injected at next session start
- [x] `.claude/launch.json` &mdash; dev server configs for `preview_start` (backend + frontend)

### Sessions 25-26 - Dev Tooling + Frontend Audit (UNCOMMITTED)
- [x] `vite.config.ts`: `host: '0.0.0.0'` &mdash; binds all interfaces for preview_start
- [x] `postcss.config.js`: absolute tailwind config path via `import.meta.url` &mdash; fixes CWD mismatch
- [x] **Full frontend audit** &mdash; 8 bugs + 6 quality + 2 accessibility issues fixed across 12 files
  - BUG 1: `Theater.tsx` &mdash; `useEffect` moved above early return (Rules of Hooks violation)
  - BUG 2: `ConversationColumn` + `TurnBubble` &mdash; N-way agent colors via `accentColor` hex prop + `hexToRgba`
  - BUG 3: `Gallery.tsx` + `Analytics.tsx` &mdash; winner badges now handle `agent_0`/`agent_1` format
  - BUG 4: `Configure.tsx` &mdash; `bg-surface-1` (nonexistent) replaced with `bg-zinc-900`
  - BUG 5: `RPGTheater.tsx` &mdash; `h-screen` replaced with `flex-1 overflow-hidden` (Layout overflow)
  - BUG 6: `RPGTheater.tsx` &mdash; `ThinkingIndicator` derives color from participant role (not hardcoded amber)
  - BUG 7: `Theater.tsx` + `RPGTheater.tsx` &mdash; `DiceOverlay.onComplete` stabilized with `useCallback`
  - BUG 8: `Campaign.tsx` &mdash; `preset: id ?? null` changed to `preset: id` (optional field type fix)
  - Q1: `modelDisplayName` extracted to `lib/format.ts`; duplicate copies removed from Gallery + Analytics
  - Q2: Dead `preset-` branch removed from `Configure.tsx` `isCustom`
  - Q3: `HumanInput.tsx` &mdash; imperative `e.currentTarget.style` mutations replaced with React state hover
  - Q4: `fetchExperiments` wrapped in `useCallback` in `Gallery.tsx`
  - Q5: `vocabRegex` in `TurnBubble.tsx` wrapped in `useMemo`
  - Q6: Explanatory comment added to `config_json` unsafe cast in `RPGTheater.tsx`
  - A1: `SeedLab.tsx` preset cards converted from `div` to `<button>`; `Gallery.tsx` rows get `role="button"`
  - A2: `ErrorBoundary.tsx` &mdash; `componentDidCatch` added for error logging
- [x] `tsc --noEmit` &mdash; zero errors after all fixes

### Next
- [ ] Commit sessions 25-26 changes (`fix(ui): frontend audit -- 17 issues resolved`)
- [ ] A2: Visual test &mdash; run pure-AI RPG session; verify companion colors, DM prose, companion cards
- [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard
- [ ] Entity snapshot quality check &mdash; after a session completes, verify `entity_snapshots` table populated

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
      format.ts           modelDisplayName() now exported here (session 26 -- removed duplicates)
      modelProvider.ts    getProvider(model) -> Provider enum
    components/common/
      ProviderSigil.tsx   16x16 SVG stroke glyph per AI provider family
      ErrorBoundary.tsx   componentDidCatch added (session 26)
    components/theater/
      RPGTheater.tsx      AI vs AI observatory; h-screen fix; ThinkingIndicator dynamic color (session 26)
      TurnBubble.tsx      accentColor hex prop + hexToRgba for N-way agent colors (session 26)
      ConversationColumn  passes accentColor={agentColor} to TurnBubble (session 26)
      DiceOverlay.tsx     Cinematic full-screen dice event (224px card, crit labels, spring anim)
      SpriteAvatar.tsx    winner sparkle diamonds + loser falling fragments (one-shot CSS)
    pages/
      RPGHub.tsx          Campaign preset browser (19 presets, 4 categories)
      Campaign.tsx        DM_BLOCKED_MODELS filter; preset type fix (session 26)
      SeedLab.tsx         Preset cards now semantic &lt;button&gt; (session 26)
      Gallery.tsx         agent_0/agent_1 winner badges; a11y row fix (session 26)
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
- **React hook order:** ALL hooks must appear BEFORE any conditional early return (Rules of Hooks).
- **TurnBubble accentColor:** pass hex string for agents 2+ (emerald `#10B981`, violet `#8B5CF6`); 2-slot `color` prop retained for ThinkingIndicator backward compat.
- **Vite host binding:** `vite.config.ts` `host: '0.0.0.0'` &mdash; preview tool connects via 127.0.0.1 (IPv4), browser via localhost/::1 (IPv6).
- **Tailwind + preview_start CWD:** `postcss.config.js` must pass absolute tailwind config path via `import.meta.url`.
