&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-02 (session 41 &mdash; spec-014 shareable URLs + relay status fix)

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

### Session 37 &mdash; Spec 018 (SHIPPED `c3848f4`)
- [x] **Spec 018 (Baseline Control Preset)** fully implemented

### Session 38 &mdash; Provider Refresh + Model Guide UI (SHIPPED `773aff5`)
- [x] Fallback map fixes, 3 new models, `MODEL_META` registry, dropdown tags + guide card

### Sessions 39-40 &mdash; Spec 017 + Spec 020 + Frontend Optimization (SHIPPED)
- [x] `feat(spec-017)` `4278a44` &mdash; replication runs: DB tables, `/replicate` endpoint, Gallery cards, ReplicationGroup detail page
- [x] `feat(spec-020)` `0d8a504` &mdash; help system: click-to-pin Tooltip, /help reference page, nav link
- [x] `perf(ui)` `79cd1d2` &mdash; Vite manualChunks, React.lazy() all 17 pages, TS fixes (5 files)

### Session 41 &mdash; Relay Status Fix + Spec 014 Shareable URLs (SHIPPED)
- [x] `fix(spec-017)` `09df6a3` &mdash; `update_replication_group_status` wired into `_cleanup_task` done-callback; group status now auto-flips `running` &rarr; `completed/partial/failed`
- [x] `feat(spec-014)` `28568de` &mdash; `?cfg=<JSON>` param on Configure page: share button copies URL to clipboard, form deserializes all state on mount (agents, rounds, seed, all toggles)
- [x] **Verified:** share &rarr; clipboard payload correct; round-trip pre-fill confirmed (rounds, maxTokens, turnDelay, seed, replicationCount all restored)

### Next Priorities (ordered)
- [ ] **Spec 005** &mdash; Hypothesis Testing Mode (Medium): structured claim + evidence flow, most impactful next feature
- [ ] **Spec 006** &mdash; A/B Forking Dashboard (Medium): visual branch tree for fork experiments
- [ ] **RelayConfig wiring** &mdash; `run_relay()` still takes 20+ individual params; `RelayConfig` from `config.py` unwired
- [ ] **Set `JUDGE_MODEL`** &mdash; `anthropic/claude-haiku-4-5-20251001` in `.env` before next batch experiments

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity | Status |
|---|-----------|---------|------------|--------|
| **005** | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium | Spec only |
| **006** | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium | Spec only |
| **014** | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Tiny | **&#x2705; SHIPPED** |
| **017** | `tasks/017-replication-runs.md` | Replication Runs | Medium | **&#x2705; SHIPPED** |
| **018** | `tasks/018-baseline-control-preset.md` | Baseline Control Preset | Small | **&#x2705; SHIPPED** |
| **019** | `tasks/019-model-version-snapshot.md` | Model Version Snapshot | Tiny | **&#x2705; SHIPPED** |
| **020** | `tasks/020-help-system.md` | Help System | Small | **&#x2705; SHIPPED** |

**Build order (MCDA-ranked):** 019 &#x2705; &rarr; 018 &#x2705; &rarr; 017 &#x2705; &rarr; 020 &#x2705; &rarr; 014 &#x2705; &rarr; next: 005 or 006

## 5. Architecture (v41.0)
```
server/
  config.py             MODEL_REGISTRY 18 models [s38]; RelayConfig (UNWIRED) [s33]
  relay_engine.py       _FALLBACK_MAP: Flash Lite, Cerebras hyphen, Jamba [s38]
  routers/
    relay.py            replication_count + /replicate + _cleanup_task fires group status [s39,s41]
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
    Configure.tsx         ?cfg= round-trip + share button + replication count UI [s39,s41]
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
- **Vite circular chunk warning:** `vendor -> vendor-react -> vendor` is cosmetic (React/scheduler co-dep) &mdash; runtime unaffected.
- **cfg URL param:** `Configure.tsx` reads `?cfg=JSON` on mount; applied after preset/remix/fork so it always wins.
