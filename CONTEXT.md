&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-03-01 (session 35 &mdash; bug fixes + specs + batch experiments)

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

### Phases 1-19 + Sessions 20-34 (SHIPPED)
See `docs/CHANGELOG.md` for full history.

### Session 35 &mdash; Bug Fixes + Playground Specs (IN PROGRESS)

#### Bugs fixed (unshipped)
- [x] **`summarizer_engine.py`**: guard was `< 6` but `hot_threshold=10`; `turns[:-10]` returns `[]` when len==8 &rarr; IndexError. Fixed: guard is now `<= hot_threshold`.
- [x] **`summarizer_engine.py`**: `model="gemini-2.5-flash"` (no prefix) &rarr; routes to Vertex AI &rarr; ImportError. Fixed: default is now `"gemini/gemini-2.5-flash"`.
- [x] **`audit_engine.py`**: was hardcoded to `gemini/gemini-2.0-flash` (quota exhausted). Fixed: audit now uses source experiment&apos;s models dynamically; fallback is `anthropic/claude-haiku-4-5-20251001`.
- [x] **`vocab_extractor.py`**: added Unicode symbol tracking (Math Operators, Arrows, Geometric Shapes, Dingbats) via `_SYMBOL_DEF_RE`, `_SYMBOL_PAREN_RE`, `_SYMBOL_RE` patterns. `"original"` added to `_CONLANG_PRESETS`.
- [x] **BOM corruption**: stripped literal `&#xFEFF;` from `Settings.tsx` and actual UTF-8 BOM bytes from `Configure.tsx`, `Documentary.tsx`, `api/types.ts`.

#### Playground specs written
12 task specs saved to `tasks/005` through `tasks/016`. See Roadmap below.

#### Batch experiment run (session 35)
5/10 experiments completed successfully (non-Gemini models):
- `ecfdc96642cc` &mdash; Philosophy: DeepSeek R1 vs Claude Sonnet, 4 rounds
- `73187cfc7d46` &mdash; Debate: GPT-4.1 vs Mistral Large, 4 rounds
- `b13879edbc62` &mdash; Cipher: Llama 4 Scout vs DeepSeek Chat, 4 rounds
- `fba9064ae73c` &mdash; Story: Haiku vs GPT-4.1 Mini + Gemini observer, 5 rounds
- `6bc944a3945c` &mdash; Original: Sonnet vs Mistral Large + memory, 4 rounds

5/10 failed: **Gemini free-tier quota exhausted** (20 req/day/model). Verdicts also null on completed experiments (judge=Gemini Flash also hit quota). Re-run with non-Gemini judge or after quota resets.

### Next
- [ ] **Commit session 35 bug fixes** (`summarizer_engine.py`, `audit_engine.py`, `vocab_extractor.py`, BOM files)
- [ ] **Gemini quota workaround**: configure `JUDGE_MODEL` to `anthropic/claude-haiku-4-5-20251001` in `.env` or re-run failed experiments after quota resets (tomorrow UTC)
- [ ] **RelayConfig wiring** (deferred): `run_relay()` still takes 20+ individual params; wire `RelayConfig` into signature + update 4 callers
- [ ] **E2E smoke run**: not run since session 33 refactor
- [ ] **Pick a playground spec to implement** (see Roadmap below)

## 4. Roadmap &mdash; Playground Specs

| # | Task file | Feature | Complexity |
|---|-----------|---------|------------|
| 005 | `tasks/005-hypothesis-testing-mode.md` | Hypothesis Testing Mode | Medium |
| 006 | `tasks/006-ab-forking-dashboard.md` | A/B Forking Dashboard | Medium |
| 007 | `tasks/007-community-experiment-library.md` | Community Library | Large |
| 008 | `tasks/008-live-intervention-console.md` | Live Intervention Console | Large |
| 009 | `tasks/009-persona-studio.md` | Persona Studio | Medium |
| 010 | `tasks/010-longitudinal-campaign-mode.md` | Campaign Mode | Large |
| 011 | `tasks/011-spectator-betting-mode.md` | Spectator / Betting | Small |
| 012 | `tasks/012-blind-turing-test.md` | Blind Turing Test | Medium |
| 013 | `tasks/013-parameter-sensitivity-heatmap.md` | Parameter Heatmap | Large |
| 014 | `tasks/014-shareable-config-urls.md` | Shareable Config URLs | Small |
| 015 | `tasks/015-what-if-replay-mode.md` | What-If Replay | Medium |
| 016 | `tasks/016-emergent-pattern-detector.md` | Pattern Detector | Large |

**Recommended first picks:** 014 (Shareable URLs &mdash; small, high value), 011 (Spectator &mdash; frontend-only), 005 (Hypothesis &mdash; minimal DB + 1 LLM call).

## 5. Architecture (v35.0)
```
server/
  config.py             RelayConfig (26 fields, UNWIRED), RPGConfig (10 fields, wired) [s33]
  relay_engine.py       judge max_retries fixed; echo/adversarial injection [s33]
  rpg_engine.py         run_rpg_match(config: RPGConfig); 5-min human AFK timeout [s33]
  summarizer_engine.py  hot_threshold guard fixed; gemini/ prefix fixed [s35]
  audit_engine.py       dynamic model selection from source experiment [s35]
  vocab_extractor.py    Unicode symbol tracking added; "original" in _CONLANG_PRESETS [s35]
  routers/relay.py      _validate_and_resolve_agents, _start_rpg_relay, _start_standard_relay [s33]
ui/src/
  lib/                  color.ts, spriteStatus.ts, exporters.ts [s33]
  hooks/                useTheaterData.ts, useColorBleed.ts [s33]
  components/configure/ AgentSlotsPanel.tsx [s33]
  api/types.ts          HumanTimeoutEvent [s34]; BOM stripped [s35]
  pages/
    Settings.tsx        Memory Bank key fix [s34]; BOM stripped [s35]
    Configure.tsx       BOM stripped [s35]
    Documentary.tsx     BOM stripped [s35]
tasks/                  005-016: 12 playground feature specs [s35]
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
