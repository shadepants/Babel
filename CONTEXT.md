&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-01 (session 36 &mdash; spec 019 implementation + session 35 commits)

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

### Phases 1-19 + Sessions 20-35 (SHIPPED)
See `docs/CHANGELOG.md` for full history.

### Session 36 &mdash; Spec 019 Implementation (SHIPPED `d4236c1`)

- [x] **E2E smoke run**: 4/6 passed, 2 skipped (expected &mdash; no verdict/running experiment in DB)
- [x] **Committed session 35 bug fixes** (`3a56f51`): summarizer guard, gemini prefix, audit dynamic models, vocab Unicode symbols, BOM strips, preset yaml em-dash fix
- [x] **Committed playground specs** (`15d1892`): 15 task files (tasks/005-019), CONTEXT.md update
- [x] **Spec 019 (Model Version Snapshot)** implemented and shipped (`d4236c1`):
  - `server/config.py`: `resolve_model_version()` &mdash; date-stamped strings extract YYYYMMDD; aliases get `@YYYY-MM-DD` proxy
  - `server/db.py`: idempotent migration adds `model_a_version`, `model_b_version` TEXT columns; `create_experiment()` accepts both
  - `server/routers/relay.py`: resolves versions for standard, N-way, and RPG paths before DB insert; belt-and-suspenders `try/except`
  - `ui/src/lib/models.ts`: new `formatModelVersion()` helper (60-char display, v-prefix for date-stamped, &ldquo;launched&rdquo; for aliases)
  - `ui/src/api/types.ts`: `model_a_version?` / `model_b_version?` added to `ExperimentRecord`
  - `ui/src/components/theater/ExperimentHeader.tsx`: version tooltip on model badges
  - `ui/src/pages/Theater.tsx`: exposes `dbExperiment` from hook; passes versions to header
  - `ui/src/pages/Gallery.tsx`: version tooltip on model name spans

### Next
- [ ] **Gemini quota workaround**: configure `JUDGE_MODEL` to `anthropic/claude-haiku-4-5-20251001` in `.env` before re-running failed experiments (or wait for quota reset)
- [ ] **Implement spec 018** (Baseline Control Preset): `server/presets/baseline.yaml` + `baseline_experiment_id` FK + Theater delta panel &mdash; ~2hr
- [ ] **Implement spec 017** (Replication Runs): `replication_groups` table + `POST /api/relay/replicate` + Gallery group card &mdash; ~half-day
- [ ] **RelayConfig wiring** (deferred): `run_relay()` still takes 20+ individual params; wire `RelayConfig` into signature + update 4 callers
- [ ] **Re-run failed experiments**: experiments 01/06/08/09/10 failed due to Gemini quota; retry with Haiku judge

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity | Status |
|---|-----------|---------|------------|--------|
| 005 | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium | Spec only |
| 006 | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium | Spec only |
| 007 | `tasks/007-community-experiment-library.md` | Community Library | Large | Spec only |
| 008 | `tasks/008-live-intervention-console.md` | Live Intervention Console | Large | Spec only |
| 009 | `tasks/009-persona-studio.md` | Persona Studio | Medium | Spec only |
| 010 | `tasks/010-longitudinal-campaign-mode.md` | Campaign Mode | Large | Spec only |
| 011 | `tasks/011-spectator-betting-mode.md` | Spectator / Betting | Small | Spec only |
| 012 | `tasks/012-blind-turing-test.md` | Blind Turing Test | Medium | Spec only |
| 013 | `tasks/013-parameter-sensitivity-heatmap.md` | Parameter Heatmap | Large | Spec only |
| 014 | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Small | Spec only |
| 015 | `tasks/015-what-if-replay-mode.md` | What-If Replay | Medium | Spec only |
| 016 | `tasks/016-emergent-pattern-detector.md` | Pattern Detector | Large | Spec only |
| **017** | `tasks/017-replication-runs.md` | **Replication Runs** | **Medium** | **Spec ready** |
| **018** | `tasks/018-baseline-control-preset.md` | **Baseline Control Preset** | **Small** | **Spec ready** |
| **019** | `tasks/019-model-version-snapshot.md` | **Model Version Snapshot** | **Tiny** | **&#x2705; SHIPPED** |

**Build order (MCDA-ranked):** 019 &#x2705; &rarr; 018 (next) &rarr; 017

## 5. Architecture (v36.0)
```
server/
  config.py             resolve_model_version() [s36]; RelayConfig (UNWIRED) [s33]; RPGConfig (wired) [s33]
  relay_engine.py       judge max_retries fixed; echo/adversarial injection [s33]
  rpg_engine.py         run_rpg_match(config: RPGConfig); 5-min human AFK timeout [s33]
  summarizer_engine.py  hot_threshold guard fixed; gemini/ prefix fixed [s35]
  audit_engine.py       dynamic model selection from source experiment [s35]
  vocab_extractor.py    Unicode symbol tracking added; "original" in _CONLANG_PRESETS [s35]
  routers/relay.py      resolve_model_version wired at create_experiment [s36]; helpers [s33]
  db.py                 model_a_version + model_b_version columns + create_experiment params [s36]
ui/src/
  lib/
    models.ts           formatModelVersion() helper [s36]
    color.ts, spriteStatus.ts, exporters.ts [s33]
  hooks/                useTheaterData.ts, useColorBleed.ts [s33]
  components/configure/ AgentSlotsPanel.tsx [s33]
  components/theater/
    ExperimentHeader.tsx version tooltip on model badges [s36]
  api/types.ts          model_a_version / model_b_version fields [s36]; BOM stripped [s35]
  pages/
    Theater.tsx         exposes dbExperiment for version passthrough [s36]
    Gallery.tsx         version tooltip on model name spans [s36]
    Settings.tsx        Memory Bank key fix [s34]; BOM stripped [s35]
    Configure.tsx       BOM stripped [s35]
    Documentary.tsx     BOM stripped [s35]
tasks/                  005-019: 15 playground feature specs [s35]
```

## 6. Don't Forget
- **File encoding:** NEVER use PowerShell to read/rewrite UTF-8 files. Use `win_write` MCP tool. Use HTML entities in JSX.
- **Tailwind content paths:** `tailwind.config.js` uses `import.meta.url` absolute paths &mdash; NEVER relative `./src/**`.
- **Tailwind dynamic classes:** NEVER `text-${color}` &mdash; purged in prod. Use explicit conditionals or `style={}`.
- **FastAPI route order:** catch-all `/{id}` routes AFTER specific routes.
- **asyncio blocking in async def:** use `asyncio.to_thread()` for SQLite/file I/O in async endpoints.
- **DB writer queue:** all writes go through `_execute_queued`; calling after `db.close()` hangs.
- **Gemini free tier:** 20 req/day/model. Default `JUDGE_MODEL` is gemini/gemini-2.5-flash &mdash; burns quota fast on scored experiments. Switch judge to Haiku for bulk runs.
- **litellm model prefix:** ALWAYS `gemini/gemini-2.5-flash` (not bare `gemini-2.5-flash`) &mdash; bare routes to Vertex AI.
- **`hidden_goals` schema:** `list[dict]` with `{agent_index: int, goal: str}`.
- **RelayConfig:** defined in `config.py` but NOT wired into `run_relay()` &mdash; 4 callers need updating.
- **RPGConfig:** fully wired &mdash; pass `config: RPGConfig` to `run_rpg_match()`.
- **Subagent definitions:** use `babel-*-agent` from `~/.claude/agents/` for future sub-tasks.
- **spec 019 versions:** null for pre-019 experiments &mdash; all UI surfaces handle null gracefully (no tooltip).
