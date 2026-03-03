&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-02 (session 42 &mdash; spec-005 hypothesis testing + RelayConfig wiring)

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

### Session 42 &mdash; JUDGE_MODEL + RelayConfig + Spec 005 (SHIPPED `d2ec223`, `6a02b0e`)
- [x] **JUDGE_MODEL** &mdash; `.env` env var; `config.py` reads via `os.getenv()` with fallback
- [x] **RelayConfig wiring** &mdash; `run_relay()` now takes `relay_config: RelayConfig | None`; all 4 call sites updated (relay.py, audit_engine.py, tournament_engine.py, + recovery path)
- [x] **Spec 005 Hypothesis Testing Mode** &mdash; full stack:
  - DB: 3 new columns + `save_hypothesis()` / `save_hypothesis_result()` helpers
  - relay_engine: `evaluate_hypothesis()` fires post-completion, emits `relay.hypothesis_result` SSE
  - routers/relay.py: `hypothesis` field on `RelayStartRequest`; saved to DB on experiment create
  - Configure.tsx: hypothesis textarea (500 char max) with falsifiable-claim hint
  - Gallery.tsx: 4 outcome badges (pending / confirmed / refuted / inconclusive)
  - Theater.tsx: hypothesis panel below verdict; SSE live + DB fallback
  - Analytics.tsx: hypothesis card with colored result + reasoning

### Next Priorities (ordered)
- [ ] **Spec 006** &mdash; A/B Forking Dashboard: visual branch tree for fork experiments; compare side-by-side
- [ ] **Spec 021+** &mdash; new specs TBD (run `/spec` to draft next feature)

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity | Status |
|---|-----------|---------|------------|--------|
| **005** | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium | **&#x2705; SHIPPED** |
| **006** | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium | Spec only |
| **014** | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Tiny | **&#x2705; SHIPPED** |
| **017** | `tasks/017-replication-runs.md` | Replication Runs | Medium | **&#x2705; SHIPPED** |
| **018** | `tasks/018-baseline-control-preset.md` | Baseline Control Preset | Small | **&#x2705; SHIPPED** |
| **019** | `tasks/019-model-version-snapshot.md` | Model Version Snapshot | Tiny | **&#x2705; SHIPPED** |
| **020** | `tasks/020-help-system.md` | Help System | Small | **&#x2705; SHIPPED** |

**Build order (MCDA-ranked):** 019 &#x2705; &rarr; 018 &#x2705; &rarr; 017 &#x2705; &rarr; 020 &#x2705; &rarr; 014 &#x2705; &rarr; 005 &#x2705; &rarr; next: 006

## 5. Architecture (v42.0)
```
server/
  config.py             RelayConfig WIRED [s42]; JUDGE_MODEL from .env [s42]
  relay_engine.py       run_relay(relay_config=RelayConfig); evaluate_hypothesis() [s42]
  audit_engine.py       uses RelayConfig() [s42]
  tournament_engine.py  uses RelayConfig() [s42]
  routers/
    relay.py            hypothesis in RelayStartRequest; all call sites use RelayConfig [s42]
    replication.py      GET /replication-groups + GET /replication-groups/:id [s39]
  db.py                 hypothesis columns + helpers [s42]; replication tables [s39]
ui/src/
  api/
    types.ts            HypothesisResultEvent + ExperimentRecord hypothesis fields [s42]
    hooks.ts            hypothesisResult in ExperimentState [s42]
  pages/
    Configure.tsx       hypothesis textarea [s42]; ?cfg= share [s41]
    Gallery.tsx         hypothesis outcome badges [s42]; group cards [s39]
    Theater.tsx         hypothesis panel + SSE/DB fallback [s42]
    Analytics.tsx       hypothesis card [s42]
    Help.tsx            4-section reference page [s39]
    ReplicationGroup.tsx stats panel + per-run table [s39]
tasks/                  005-020: playground feature specs
```

## 6. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **Gemini free tier:** Flash 250 RPD, Flash Lite 1000 RPD, Pro 100 RPD. JUDGE_MODEL now reads from `.env`.
- **litellm model prefix:** ALWAYS `gemini/gemini-2.5-flash` (not bare) &mdash; bare routes to Vertex AI.
- **Cerebras model ID:** uses hyphens &mdash; `cerebras/llama-3.3-70b` (NOT `llama3.3-70b`).
- **modelMeta.ts:** keyed by full litellm string; add entry whenever MODEL_REGISTRY changes.
- **Vite circular chunk warning:** `vendor -> vendor-react -> vendor` is cosmetic (React/scheduler co-dep) &mdash; runtime unaffected.
- **cfg URL param:** `Configure.tsx` reads `?cfg=JSON` on mount; applied after preset/remix/fork so it always wins.
- **agents_config_json:** Must be populated for ALL experiment paths. If NULL, Theater shows 0 turns.
