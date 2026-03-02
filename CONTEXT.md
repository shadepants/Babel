&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-02 (session 40 &mdash; frontend optimization + TS clean)

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

### Phases 1-19 + Sessions 20-36 (SHIPPED)
See `docs/CHANGELOG.md` for full history.

### Session 37 &mdash; Spec 018 Implementation (SHIPPED `c3848f4`)
- [x] **Spec 018 (Baseline Control Preset)** fully implemented (9 files across backend + frontend)

### Session 38 &mdash; Provider Refresh + Model Guide UI (SHIPPED `773aff5`)
- [x] **`server/relay_engine.py`** &mdash; fixed `_FALLBACK_MAP` (Flash Lite, Cerebras hyphen, Jamba)
- [x] **`server/config.py`** &mdash; added 3 new models (Gemini Flash Lite, GPT-4.1 Nano, Llama 3.3 70B)
- [x] **`ui/src/lib/modelMeta.ts`** &mdash; `MODEL_META` + `TIER_COLOR` static registry (18 models)
- [x] **`ui/src/components/configure/AgentSlotsPanel.tsx`** &mdash; dropdown tag subtitles + guide card

### Session 39 &mdash; Spec 017 Replication Runs + Spec 020 Help System (UNCOMMITTED)
- [x] **`server/db.py`** &mdash; `replication_groups` table + migration + 5 new helpers
- [x] **`server/routers/relay.py`** &mdash; `replication_count` + `/relay/replicate` endpoint
- [x] **`server/routers/replication.py`** &mdash; new router: `GET /api/replication-groups` + `GET /api/replication-groups/:id`
- [x] **`ui/src/api/types.ts` + `client.ts`** &mdash; full ReplicationGroup type set + 3 API methods
- [x] **`ui/src/pages/Configure.tsx`** &mdash; replication count UI (1&ndash;10) + Tooltip icons on 10 section labels
- [x] **`ui/src/pages/ReplicationGroup.tsx`** &mdash; detail page: stats panel, per-run table, 10s poll
- [x] **`ui/src/pages/Gallery.tsx`** &mdash; replication group cards + `standaloneExperiments` filter
- [x] **`ui/src/components/common/Tooltip.tsx`** &mdash; click-to-pin singleton tooltip component
- [x] **`ui/src/pages/Help.tsx`** &mdash; 4-section reference page (concepts, configure, models, presets)
- [x] **`App.tsx`** &mdash; `/help` route added; **`Layout.tsx`** &mdash; Help nav link

### Session 40 &mdash; Frontend Optimization + TypeScript Clean (UNCOMMITTED)
- [x] **`ui/vite.config.ts`** &mdash; `manualChunks`: d3 / framer-motion / radix / react / icons / vendor
- [x] **`ui/src/App.tsx`** &mdash; all 17 page imports converted to `React.lazy()` + `<Suspense>`
- [x] **`ui/src/pages/Gallery.tsx`** &mdash; `standaloneExperiments` wrapped in `useMemo([experiments])`
- [x] **TypeScript errors fixed** &mdash; Configure, Campaign, RPGTheater, ReplicationGroup, RPGHub (5 files)
- [x] **Build result** &mdash; 873 KB monolith &rarr; 17 KB entry + lazy page chunks + named vendor chunks; tsc clean

### Next
- [ ] **Commit** all uncommitted work (spec 017 + 020 + session 40 optimization, ~15 files)
- [ ] **Wire `update_replication_group_status`** &mdash; call from relay completion path so group status updates `running` &rarr; `completed`
- [ ] **Set `JUDGE_MODEL`** to `anthropic/claude-haiku-4-5-20251001` in `.env` before re-running batch experiments
- [ ] **RelayConfig wiring** (deferred): `run_relay()` still takes 20+ individual params

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity | Status |
|---|-----------|---------|------------|--------|
| 005 | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium | Spec only |
| 006 | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium | Spec only |
| 014 | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Small | Spec only |
| **017** | `tasks/017-replication-runs.md` | **Replication Runs** | **Medium** | **&#x2705; SHIPPED** |
| **018** | `tasks/018-baseline-control-preset.md` | **Baseline Control Preset** | **Small** | **&#x2705; SHIPPED** |
| **019** | `tasks/019-model-version-snapshot.md` | **Model Version Snapshot** | **Tiny** | **&#x2705; SHIPPED** |
| **020** | `tasks/020-help-system.md` | **Help System** | **Small** | **&#x2705; SHIPPED** |

**Build order (MCDA-ranked):** 019 &#x2705; &rarr; 018 &#x2705; &rarr; 017 &#x2705; &rarr; 020 &#x2705; &rarr; next: 014 or 005

## 5. Architecture (v40.0)
```
server/
  config.py             MODEL_REGISTRY 18 models [s38]; RelayConfig (UNWIRED) [s33]
  relay_engine.py       _FALLBACK_MAP: Flash Lite, Cerebras hyphen, Jamba [s38]
  routers/
    relay.py            replication_count + /replicate endpoint [s39]
    replication.py      GET /replication-groups + GET /replication-groups/:id [s39]
  db.py                 replication_groups table + 5 helpers [s39]
ui/src/
  App.tsx               ALL 17 pages lazy-loaded via React.lazy() + Suspense [s40]
  vite.config.ts        manualChunks: d3/motion/ui/icons/react/vendor [s40]
  components/common/
    Tooltip.tsx         click-to-pin singleton tooltip [s39]
  pages/
    Help.tsx            4-section reference page (concepts/configure/models/presets) [s39]
    ReplicationGroup.tsx  stats panel + per-run table + 10s poll [s39]
    Configure.tsx         replication count UI + Tooltip icons on 10 labels [s39]
    Gallery.tsx           group cards + standaloneExperiments useMemo [s39,s40]
tasks/                  005-020: 16 playground feature specs
```

## 6. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **Gemini free tier:** Flash 250 RPD, Flash Lite 1000 RPD, Pro 100 RPD. Default `JUDGE_MODEL` burns quota.
- **litellm model prefix:** ALWAYS `gemini/gemini-2.5-flash` (not bare) &mdash; bare routes to Vertex AI.
- **Cerebras model ID:** uses hyphens &mdash; `cerebras/llama-3.3-70b` (NOT `llama3.3-70b`).
- **RelayConfig:** defined in `config.py` but NOT wired into `run_relay()` &mdash; 4 callers need updating.
- **modelMeta.ts:** keyed by full litellm string; add entry whenever MODEL_REGISTRY changes.
- **replication_group status:** `update_replication_group_status` exists but not yet called from relay completion path.
- **Vite circular chunk warning:** `vendor -> vendor-react -> vendor` is cosmetic (React/scheduler co-dep) &mdash; runtime unaffected.
