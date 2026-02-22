# Babel — AI-to-AI Conversation Arena

**Last Updated:** 2026-02-22 (Phase 6 complete)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time — co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers: Anthropic, Google, OpenAI, DeepSeek, Groq, Cerebras, Mistral, SambaNova, OpenRouter)
- **Real-time:** Server-Sent Events (SSE)
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI v4
- **Visualization:** D3.js 7 (vocabulary constellation + analytics charts + radar chart)
- **Database:** SQLite (WAL mode) — experiments, turns, vocabulary, tournaments, tournament_matches
- **Testing:** pytest (backend) + vitest (frontend)

## 3. Current State

### Completed (in Factory)
- [x] Working relay engine prototype (`Factory/experiments/ai_relay.py`, 370 lines)
- [x] Smoke test passed (1 round, Claude Sonnet + Gemini Flash, 44s)
- [x] Full 5-round run completed — 40+ invented words with grammar in 95s
- [x] JSON + Markdown dual transcript output

### Phase 1: Project Scaffold + Backend Core (DONE)
- [x] Python venv + FastAPI skeleton, relay engine, EventHub SSE, SQLite schema, config/model registry
- [x] Gemini Checkpoint 1 — 4 fixes (keepalive bug, token tracking, null guard, atomic upsert)

### Phase 2: React UI Shell + Theater View (DONE)
- [x] React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI scaffold
- [x] Conversation Theater — split columns, turn bubbles, thinking states, SSE streaming
- [x] Gemini Checkpoint 2 — 5 fixes (queue keepalive, O(n²) render, reconnect dedup, auto-scroll, a11y)

### Phase 3: Vocabulary Extractor + Dictionary (DONE)
- [x] Regex vocab extractor, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation
- [x] Gemini Checkpoint 3 — removed `system_prompt: ''` override

### Phase 4: Seed Lab + Presets (DONE)
- [x] 6 preset YAMLs, SeedLab landing page, Configure page, Theater simplified to pure live-view, nav bar
- [x] Audit fixes: route ordering, resilient preset loader, dynamic Tailwind class fix

### Phase 5: Gallery + Analytics (DONE)
- [x] Gallery at `/gallery` — card grid, status badges, quick-nav to Theater/Dictionary
- [x] Analytics at `/analytics/:experimentId` — stats row, D3 vocab growth + latency charts, JSON/markdown export
- [x] Gemini Checkpoint 4 — 4 fixes (incremental D3 graph, EventHub buffer 200→2000, async vocab extraction, self-ref parent word filter)

### Phase 6: Arena Mode + Polish (DONE)
- [x] **Tournament engine** — round-robin runner, sequential match execution, SSE lifecycle events
- [x] **Tournament DB** — `tournaments` + `tournament_matches` tables, leaderboard aggregation, per-model radar stats
- [x] **Tournament router** — start/list/detail/leaderboard/stream endpoints; asyncio task storage; model allowlist; query bounds; SSE self-close
- [x] **Arena page** at `/arena` — model multi-select (min 3, max 10), preset dropdown, live pairing count, tournament launcher
- [x] **Tournament page** at `/tournament/:id` — live match grid, progress bar, leaderboard table, radar chart overlay
- [x] **RadarChart** — D3 spider chart (verbosity/speed/creativity/consistency/engagement), multi-model polygon overlay
- [x] **Settings page** at `/settings` — live API key status indicators + model registry table
- [x] **"The Original" preset** — recreate viral Reddit Claude vs Gemini experiment (15 rounds, exact seed words)
- [x] **Relay router** — model allowlist validation, `/models/status` endpoint
- [x] **Audit hardening** — DB normalization zero-collapse fix, consistency metric inversion, error message sanitization, query bounds across all routers
- [x] **README** — quick start, architecture, presets table, model support
- [x] **Bug fixes** — LatencyChart CSS selector crash (dots in model names), copy markdown silent failure → execCommand fallback + Copied!/Failed feedback
- [x] Build passes: 2456 modules, 0 errors

### Future Expansions
- [ ] **Side-by-side comparison view** (Phase 6b) — compare two experiments head-to-head
- [ ] **Pixel Sprites** — 8-bit reactive avatars synced to SSE state
- [ ] **Virtual Tabletop** — asymmetric multi-agent RPG mode with human-in-the-loop

## 4. Architecture
```
Babel/
  server/
    app.py                     FastAPI app — mounts relay, experiments, presets, tournaments routers
    config.py                  Settings, model registry (7 models across 5 providers)
    presets.py                 YAML preset loader (resilient, logs malformed files)
    relay_engine.py            Core relay loop — call_model, build_messages, vocab extraction
    tournament_engine.py       Round-robin tournament runner — sequential matches, SSE events
    vocab_extractor.py         Regex-based invented word detection
    db.py                      SQLite schema + queries (experiments, turns, vocabulary, tournaments)
    event_hub.py               SSE pub/sub (standalone, match_id filtering)
    presets/
      conlang.yaml             Build a symbolic language (default)
      debate.yaml              Two models argue opposing sides
      story.yaml               Collaborative story writing
      cipher.yaml              Build an encryption system
      emotion-math.yaml        Mathematical notation for emotions
      philosophy.yaml          Explore deep questions
      original.yaml            Recreate viral Reddit experiment (15 rounds)
    routers/
      relay.py                 POST /start (+ preset resolution + model validation), GET /stream (SSE), GET /models/status
      experiments.py           GET list/detail/vocabulary/stats/turns/radar
      presets.py               GET list/detail
      tournaments.py           POST /start, GET list/detail/leaderboard/stream
  ui/
    src/
      pages/
        SeedLab.tsx            Landing page — preset card grid + custom card
        Configure.tsx          Experiment config — models, sliders, seed, system prompt
        Theater.tsx            Pure live-view — SSE stream, split columns, vocab panel
        Dictionary.tsx         WordCard grid + D3 constellation
        Gallery.tsx            Past experiments card grid with status badges
        Analytics.tsx          Per-experiment stats, D3 charts, JSON/markdown export
        Arena.tsx              Tournament setup — model multi-select, launcher
        Tournament.tsx         Live match grid, leaderboard, radar chart
        Settings.tsx           API key status + model registry
      components/
        theater/               TurnBubble, ThinkingIndicator, RoundDivider, VocabPanel
        dictionary/            WordCard, ConstellationGraph (incremental D3)
        analytics/             VocabGrowthChart, LatencyChart, RadarChart (D3)
        common/                Layout (nav bar), ErrorBoundary
        ui/                    9 Shadcn primitives
      api/
        types.ts               All REST + SSE types including tournament + radar types
        client.ts              fetchJson + api object (15+ endpoints)
        sse.ts                 useSSE hook (EventSource, typed events)
        hooks.ts               useExperimentState (event sourcing)
```

## 5. Commands (PowerShell)
```powershell
# Backend
& ".\.venv\Scripts\python.exe" -m uvicorn server.app:app --reload --port 8000

# Frontend (dev)
Set-Location ui && .\run_npm.cmd dev

# Tests
& ".\.venv\Scripts\python.exe" -m pytest tests/ -v
```

## 6. "Don't Forget" Rules
- **Origin:** Inspired by https://www.reddit.com/r/ClaudeAI/comments/1rb9dpr/ — human relayed messages between Claude + Gemini until they invented SYNTHOLINK language
- **Standalone:** All backend code is self-contained. Zero cross-repo dependencies.
- **SQLite:** aiosqlite with `journal_mode=WAL` + `foreign_keys=ON` + `synchronous=NORMAL`
- **litellm model strings:** prefix/model format — e.g. `anthropic/claude-sonnet-4-20250514`, `gemini/gemini-2.5-flash`
- **All API keys in Factory `.env`** — copy or symlink for Babel
- **Model allowlist enforced server-side** — relay and tournament routers validate against `MODEL_REGISTRY`
- **Tournament SSE uses `match_id=tournament_id`** — reuses EventHub filter unchanged; individual match events still use their own experiment IDs
- **CSS selector safety** — D3 class names derived from model strings must be sanitized: `label.replace(/[^a-zA-Z0-9_-]/g, '_')`
- **Rounds cap:** Configure = 15, Arena = 15, tournament router `le=15`. Context grows each round — later rounds exponentially slower.
- **Windows:** Use `asyncio.WindowsSelectorEventLoopPolicy()` before any server creation
