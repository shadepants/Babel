# Babel — AI-to-AI Conversation Arena

**Last Updated:** 2026-02-22 (Phase 4 complete)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time — co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers: Anthropic, Google, OpenAI, DeepSeek, Groq, Cerebras, Mistral, SambaNova, OpenRouter)
- **Real-time:** Server-Sent Events (SSE)
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI v4
- **Visualization:** D3.js 7 (vocabulary constellation) + Recharts 2 (analytics charts)
- **Database:** SQLite (WAL mode) — experiments, turns, vocabulary
- **Testing:** pytest (backend) + vitest (frontend)

## 3. Current State

### Completed (in Factory)
- [x] Working relay engine prototype (`Factory/experiments/ai_relay.py`, 370 lines)
- [x] Smoke test passed (1 round, Claude Sonnet + Gemini Flash, 44s)
- [x] Full 5-round run completed — 40+ invented words with grammar in 95s
- [x] JSON + Markdown dual transcript output
- [x] CLI flags: `--model-a/b`, `--seed`, `--rounds`, `--temperature`, `--max-tokens`, `--delay`, `--interactive`, `--verbose`
- [x] Full project plan at `~/.claude/plans/partitioned-coalescing-barto.md`

### Phase 1: Project Scaffold + Backend Core (DONE)
- [x] Python venv + FastAPI skeleton (`server/app.py`)
- [x] Relay engine extracted — standalone, zero Factory imports (`server/relay_engine.py`)
- [x] EventHub SSE pub/sub — standalone (`server/event_hub.py`)
- [x] SQLite schema + CRUD with hardened indexes/constraints (`server/db.py`)
- [x] SSE streaming endpoint with keepalive heartbeat (`/api/relay/stream`)
- [x] Config + model registry (`server/config.py`)
- [x] Verified: 1-round relay (Gemini Flash + Llama 3.3 70B) in 5.4s, DB correct
- [x] Gemini Checkpoint 1 complete — 4 fixes applied (keepalive bug, token tracking, null guard, atomic upsert)

### Phase 2: React UI Shell + Theater View (DONE)
- [x] Scaffold React app (Vite 7 + React 19 + Tailwind 3.4 + Shadcn/UI v4)
- [x] Conversation Theater — split columns, turn bubbles, thinking states
- [x] Wire SSE client to stream turns live
- [x] Start Experiment form (model selects, seed textarea, round slider)
- [x] Build passes: 1875 modules, zero errors
- [x] Gemini Checkpoint 2 — 5 fixes: Queue-based keepalive, O(n²) render fix, reconnect dedup, smart auto-scroll, aria-live a11y

### Phase 3: Vocabulary Extractor + Dictionary (DONE)
- [x] Regex-based vocabulary extractor — detects definitions, ALL_CAPS tokens, categories, parent word relationships
- [x] `relay.vocab` SSE events published live after each turn (wired into relay loop)
- [x] Experiments REST router — `GET /api/experiments/{id}`, `GET /api/experiments/{id}/vocabulary`
- [x] VocabPanel inline strip in Theater — word count + recent words + "View dictionary" link
- [x] Living dictionary page at `/dictionary/:experimentId` — WordCard grid + D3 constellation toggle
- [x] D3 v7 force-directed constellation graph (nodes sized by usage, edges from parent_words, color by speaker, draggable)
- [x] Gemini Checkpoint 3 bug fix: removed `system_prompt: ''` that was overriding server default (4/6 Gemini findings were already fixed in Checkpoint 2)
- [x] Build passes: 2445 modules, zero errors

### Phase 4: Seed Lab + Presets (DONE)
- [x] 6 preset YAML files (conlang, debate, story, cipher, emotion-math, philosophy) in `server/presets/`
- [x] Backend preset loader (`server/presets.py`) + REST router (`server/routers/presets.py`)
- [x] Server-side preset resolution in `POST /api/relay/start` (authoritative source of truth)
- [x] SeedLab landing page at `/` — preset card grid + custom experiment card
- [x] Configure page at `/configure/:presetId` — full experiment setup (models, rounds, temperature, max tokens, seed, system prompt)
- [x] Settings placeholder page at `/settings` (Phase 5/6)
- [x] Theater simplified to pure live-view at `/theater/:matchId` (setup form removed)
- [x] Nav bar added to Layout (BABEL brand + Seed Lab + Settings links)
- [x] Audit fixes: route ordering bug in experiments.py, unused imports, resilient preset loader, dynamic Tailwind class fix
- [x] Build passes: 2449 modules, zero errors

### Phase 5: Gallery + Analytics
- [ ] Experiment gallery (past runs, card grid)
- [ ] Analytics dashboard (growth curves, adoption rate, latency)
- [ ] Export features (markdown blog post, JSON download)

### Phase 6: Arena Mode + Polish
- [ ] Multi-model tournament runner
- [ ] Side-by-side comparison view
- [ ] Model personality radar chart
- [ ] README with screenshots, GitHub publish

### Future Expansions (Gemini Proposals)
- [ ] **Pixel Sprites** — 8-bit reactive avatars synced to SSE state (idle/thinking/talking/error) with typewriter effect (`GEMINI_Feature_Specification_PIXEL.md`)
- [ ] **Virtual Tabletop** — Asymmetric multi-agent RPG mode with human-in-the-loop via `asyncio.Event` pause/resume and `POST /inject` endpoint (`GEM_The_Virtual_Tabletop_expansion.md`)

## 4. Architecture
```
Babel/
  server/
    app.py                     FastAPI app with lifespan, mounts relay + experiments + presets routers
    config.py                  Settings, model registry
    presets.py                 YAML preset loader (resilient, logs malformed files)
    relay_engine.py            Core relay loop + vocab extraction hook
    vocab_extractor.py         Regex-based invented word detection
    db.py                      SQLite schema + queries (experiments, turns, vocabulary)
    event_hub.py               SSE pub/sub (standalone, no Factory deps)
    presets/
      conlang.yaml             Build a symbolic language (default preset)
      debate.yaml              Two models argue opposing sides
      story.yaml               Collaborative story writing
      cipher.yaml              Build an encryption system
      emotion-math.yaml        Mathematical notation for emotions
      philosophy.yaml          Explore deep questions
    routers/
      relay.py                 POST /api/relay/start (+ preset resolution), GET /api/relay/stream (SSE)
      experiments.py            GET /api/experiments (list, detail, vocabulary)
      presets.py               GET /api/presets (list, detail)
  ui/
    src/
      pages/
        SeedLab.tsx             Landing page — preset card grid + custom card
        Configure.tsx           Full experiment config — models, sliders, seed, system prompt
        Theater.tsx             Pure live-view — SSE stream, split columns, vocab panel
        Dictionary.tsx          Cards grid + D3 constellation, polls for live updates
        Settings.tsx            Placeholder for Phase 5/6
      components/
        theater/                TurnBubble, ThinkingIndicator, RoundDivider,
                                ConversationColumn, ExperimentHeader, VocabPanel
        dictionary/             WordCard, ConstellationGraph
        common/                 Layout (nav bar), ErrorBoundary
        ui/                     9 Shadcn primitives
      api/
        types.ts                SSE events + REST types + Preset types
        client.ts               fetchJson + api object (7 endpoints)
        sse.ts                  useSSE hook (EventSource, typed events)
        hooks.ts                useExperimentState (event sourcing)
  tests/                       pytest + vitest
```

## 5. Commands (PowerShell)
```powershell
# Backend only
& ".\.venv\Scripts\python.exe" -m uvicorn server.app:app --reload --port 8000

# Frontend only (dev)
Set-Location ui && .\run_npm.cmd dev

# Run tests
& ".\.venv\Scripts\python.exe" -m pytest tests/ -v
```

## 6. "Don't Forget" Rules
- **Origin:** Inspired by https://www.reddit.com/r/ClaudeAI/comments/1rb9dpr/ — human relayed messages between Claude + Gemini until they invented SYNTHOLINK language
- **Standalone:** All backend code is self-contained. Factory patterns were adapted, not imported. Zero cross-repo dependencies.
- **Factory UI patterns adapted:** ForceGraph.tsx → ConstellationGraph (D3 force sim), tailwind.config.js (dark arena theme), StatusCard → ExperimentHeader
- **SQLite:** aiosqlite with `journal_mode=WAL` + `foreign_keys=ON` + `synchronous=NORMAL`
- **litellm model strings:** `anthropic/claude-sonnet-4-20250514`, `gemini/gemini-2.5-flash`, `deepseek/deepseek-chat`, `groq/llama-3.3-70b-versatile`
- **All API keys in Factory `.env`** — copy or symlink for Babel
- **15-round timeout:** Context window grows each round → later rounds exponentially slower. Cap at 5-7 for live UI, or summarize history after N rounds
- **Windows:** Use `asyncio.WindowsSelectorEventLoopPolicy()` before any server creation
