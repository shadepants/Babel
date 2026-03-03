&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-03 (session 44 complete &mdash; Spec 005 smoke test + temp UX)

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

### Session 37-41 (SHIPPED)
- [x] Spec 018 Baseline Control Preset, provider refresh + model guide, Spec 017 replication runs
- [x] Spec 020 help system, perf: route-level code splitting, Spec 014 shareable config URLs
- [x] relay status fix: `update_replication_group_status` wired into done-callback

### Session 42 &mdash; JUDGE_MODEL + RelayConfig + Spec 005 (SHIPPED)
- [x] JUDGE_MODEL env var; RelayConfig wiring into run_relay(); Spec 005 Hypothesis Testing Mode full stack

### Session 43 &mdash; Spec 006 A/B Comparison Dashboard (SHIPPED + VERIFIED)
- [x] **DB** &mdash; `comparison_group_id` + `comparison_variant` columns; helpers
- [x] **POST /api/relay/compare** &mdash; forks experiment with one changed param
- [x] **GET /api/experiments/{id}/comparison** &mdash; vocab diff + auto-detected changed field
- [x] **Compare.tsx** &mdash; new `/compare/:experimentId` page: side-by-side cards, metric diff bar
- [x] **Theater.tsx** &mdash; Compare button + setup panel + effectiveStatus fallback

### Session 44 &mdash; Temp UX + Spec 005 Smoke Test (SHIPPED + VERIFIED)
- [x] **provider-aware temperature** &mdash; `modelMeta.ts` `maxTemp`/`recommendedMax` per model; AgentSlotsPanel slider max is dynamic; clamp on model switch; provider cap hint + recommended range hint
- [x] **Theater Compare panel** &mdash; same max/recommended logic; submit guard blocks out-of-range temps
- [x] **fix relay_engine None bug** &mdash; `list(cfg.hidden_goals or [])` / `initial_history` / `vocabulary_seed` &mdash; prevented crash on any experiment omitting optional fields (cf25d85)
- [x] **Spec 005 E2E smoke test PASSED** &mdash; Gallery &#x2718; REFUTED badge + Theater hypothesis panel + Analytics hypothesis card all verified live

### Known Issue (session 44)
- `GET /api/experiments/{id}` returns `turns: []` (0) even when 8 turns exist &mdash; Analytics reads from a different query and shows correctly. Likely a DB join or serialization bug in the experiments endpoint.

### Next Priorities (ordered)
- [ ] **Investigate turns: 0 API bug** &mdash; `/api/experiments/{id}` not returning turns array (Analytics shows correct count)
- [ ] **Spec 021+** &mdash; new specs TBD (run `/spec` to draft next feature)
- [ ] **Model registry deep dive** &mdash; audit MODEL_REGISTRY vs modelMeta.ts for gaps/mismatches

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity | Status |
|---|-----------|---------|------------|--------|
| **005** | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium | **&#x2705; SHIPPED** |
| **006** | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium | **&#x2705; SHIPPED** |
| **014** | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Tiny | **&#x2705; SHIPPED** |
| **017** | `tasks/017-replication-runs.md` | Replication Runs | Medium | **&#x2705; SHIPPED** |
| **018** | `tasks/018-baseline-control-preset.md` | Baseline Control Preset | Small | **&#x2705; SHIPPED** |
| **019** | `tasks/019-model-version-snapshot.md` | Model Version Snapshot | Tiny | **&#x2705; SHIPPED** |
| **020** | `tasks/020-help-system.md` | Help System | Small | **&#x2705; SHIPPED** |

**Build order (MCDA-ranked):** 019 &#x2705; &rarr; 018 &#x2705; &rarr; 017 &#x2705; &rarr; 020 &#x2705; &rarr; 014 &#x2705; &rarr; 005 &#x2705; &rarr; 006 &#x2705; &rarr; next: 021+

## 5. Architecture (v44.0)
```
server/
  config.py             RelayConfig WIRED [s42]; JUDGE_MODEL from .env [s42]
  relay_engine.py       run_relay(relay_config=RelayConfig); or [] guards [s44]
  audit_engine.py       uses RelayConfig() [s42]
  tournament_engine.py  uses RelayConfig() [s42]
  routers/
    relay.py            POST /compare (spec-006) [s43]; hypothesis in RelayStartRequest [s42]
    experiments.py      GET /{id}/comparison (spec-006) [s43]
    replication.py      GET /replication-groups + GET /replication-groups/:id [s39]
  db.py                 comparison_group columns + helpers [s43]; hypothesis [s42]
ui/src/
  lib/
    modelMeta.ts        maxTemp + recommendedMax per model; getMaxTemp/getRecommendedMax [s44]
  pages/
    Compare.tsx         /compare/:experimentId page [s43] (NEW)
    Theater.tsx         Compare button + panel [s43]; temp max/guard [s44]
    Configure.tsx       hypothesis textarea [s42]; ?cfg= share [s41]
    Gallery.tsx         hypothesis outcome badges [s42]; group cards [s39]
    Analytics.tsx       hypothesis card [s42]
  components/configure/
    AgentSlotsPanel.tsx dynamic slider max + recommended hints [s44]
tasks/                  005-020: playground feature specs
```

## 6. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **git commit temp files:** Use `win_write` MCP tool (NOT PowerShell `Out-File`) &mdash; PowerShell adds BOM to UTF-8 files, corrupting commit messages.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **Gemini free tier:** Flash 250 RPD, Flash Lite 1000 RPD, Pro 100 RPD. JUDGE_MODEL now reads from `.env`.
- **litellm model prefix:** ALWAYS `gemini/gemini-2.5-flash` (not bare) &mdash; bare routes to Vertex AI.
- **Cerebras model ID:** uses hyphens &mdash; `cerebras/llama-3.3-70b` (NOT `llama3.3-70b`).
- **modelMeta.ts:** keyed by full litellm string; add entry whenever MODEL_REGISTRY changes. Anthropic maxTemp=1.0; all others=2.0.
- **Vite circular chunk warning:** `vendor -> vendor-react -> vendor` is cosmetic (React/scheduler co-dep) &mdash; runtime unaffected.
- **cfg URL param:** `Configure.tsx` reads `?cfg=JSON` on mount; applied after preset/remix/fork so it always wins.
- **agents_config_json:** Must be populated for ALL experiment paths. If NULL, Theater shows 0 turns.
- **Comparison group guard:** `POST /api/relay/compare` rejects experiments that already have a comparison_group_id.
- **Theater effectiveStatus:** `experiment.status` (SSE) falls back to `dbExperiment.status` (DB) so the completed action bar renders for old/reloaded experiments.
