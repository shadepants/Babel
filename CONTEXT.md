# Babel — AI-to-AI Conversation Arena

**Last Updated:** 2026-02-23 (Tasks 001+002: judge model + per-turn scoring + verdict)

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
- [x] Gemini Checkpoint 2 — 5 fixes (queue keepalive, O(n2) render, reconnect dedup, auto-scroll, a11y)

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

### Phase 7: Sci-Fi Observatory UI/UX (DONE)
- [x] **Design system** — Orbitron (display), Inter (UI), JetBrains Mono (conversation) fonts; amber/cyan model colors; CSS glow tokens
- [x] **StarField** — tsParticles ambient star field, 160 particles, always-on behind all pages
- [x] **Theater reactive canvas** — pulse rings + 12-dot vocab bursts per turn (TheaterCanvas.tsx), column glow on thinking, nav border transitions via data-active-model attribute
- [x] **SeedLab animations** — Framer Motion staggered card entrances (100ms), heading fade-up, hover scale + accent glow
- [x] **Backend** — turn_delay_seconds param (default 2.0s) in relay engine so animations are visible between turns
- [x] **Framer Motion + tsParticles** installed (framer-motion 12.x, @tsparticles/react + @tsparticles/slim)

### Phase 8: Full Neural Design System (DONE)
- [x] **Global typography** — all h1/h2 → Orbitron uppercase via CSS; `.neural-section-label` monospace headers
- [x] **NoiseOverlay.tsx** — CSS grain texture over entire viewport (opacity ~2%)
- [x] **HudBrackets.tsx** — corner bracket decoration for preset cards
- [x] **BABEL shimmer** — chromatic shimmer animation on wordmark in Layout
- [x] **Neural card classes** — `.neural-card`, `.neural-row` + status variants (left-stripe colored), `.status-dot` + variants
- [x] **`.neural-btn`**, **`.neural-provider`** (left-stripe Settings panels), **`.neural-section-label`**
- [x] **Gallery** → terminal log rows with left-stripe color per status
- [x] **Arena** → neural terminal panel with `// section_labels`
- [x] **Configure** → geometric symbols, section labels, SYMBOL_MAP (emoji → geometric)
- [x] **Settings** → left-stripe provider panels, status dots, key status
- [x] **SeedLab** → emoji replaced with geometric symbols via SYMBOL_MAP + FALLBACK_SYMBOLS
- [x] **Layout** → Orbitron monospace nav links

### Phase 9: Living Neural Network (DONE)
- [x] **StarField rewrite** — pure canvas (replaces tsParticles); 3 depth layers (0.25/0.62/1.0) with mouse parallax; cascade pulses (4 hops, purple→cyan→amber→white); route-aware RGB lerp tint
- [x] **ScrambleText.tsx** — ASCII-only glyph scramble on mount, left-to-right reveal, 2000ms duration
- [x] **Page transitions** — AnimatePresence blur-fade in Layout.tsx, keyed by pathname
- [x] **BABEL glitch** — 4-frame chromatic aberration every 9–22s on wordmark
- [x] **Route-aware tint** — AppInner reads useLocation(), maps route → RGB, passes to StarField
- [x] **ScrambleText applied** to all 5 pages (SeedLab, Gallery, Arena, Configure, Settings)
- [x] **Synaptic bloom** (#3) — nodes accumulate screen-blend halo (42–104px) on pulse arrival; decays ~5.5s
- [x] **Activity trails** (#5) — edges glow thicker/brighter for ~1.4s after carrying a pulse
- [x] **Gamma burst events** (#7) — 12-node synchronized fire every 15–40s; expanding ring visual
- [x] **Encoding fix** — rewrote all 5 pages via win_write to fix PowerShell UTF-8 double-encoding artifacts; HTML entities for all non-ASCII JSX chars

### Gemini Audit Hardening (DONE)
- [x] **`server/db.py`** — `asyncio.Lock` write lock; all 7 write methods wrapped
- [x] **`server/relay_engine.py`** — `_log_task_exception()` callback on all `create_task()` calls
- [x] **`server/event_hub.py`** — monotonic `event_id` counter; `subscribe()` accepts `last_event_id` for selective replay
- [x] **`server/routers/relay.py`** — SSE emits `id: N\n`; reads `Last-Event-ID` on reconnect
- [x] **`server/routers/tournaments.py`** — same SSE id + Last-Event-ID treatment

### Task 003: Per-Participant Temperature (DONE)
- [x] **`server/db.py`** — idempotent `ALTER TABLE` migrations for `temperature_a` / `temperature_b` (DEFAULT 0.7); `create_experiment()` stores both
- [x] **`server/routers/relay.py`** — `RelayStartRequest` split `temperature` → `temperature_a` + `temperature_b`; each `RelayAgent` gets its own temp
- [x] **`ui/src/api/types.ts`** — `RelayStartRequest` + `ExperimentRecord` updated
- [x] **`ui/src/pages/Configure.tsx`** — two per-model temperature sliders (amber = A, cyan = B); `presetDefaults`, `hasParamChanges`, `handleResetParams`, `handleLaunch` all updated
- [x] **`ui/src/pages/Analytics.tsx`** — conditional Temp A / Temp B stat cards (guarded by `!= null` for backwards compat)

### Configure Page Polish (DONE)
- [x] **Pre-launch estimate bar** — displays `~Xm Xs` and `≤X tokens` above Launch button, computed live from rounds × 2 × (6s + turnDelay) and rounds × 2 × maxTokens

### SeedLab Tag Filtering (DONE)
- [x] **Tag chip row** — `allTags` derived from preset metadata; `activeTag` state filters `visiblePresets`; "all" chip resets filter; active chip styled with accent border

### Task 005: CSV Export (DONE)
- [x] **`ui/src/pages/Analytics.tsx`** — "Download CSV" button; exports `round,speaker,model,content,latency_seconds,token_count`; content cells RFC-4180 quoted

### Next Up
- [x] **Task 002** — configurable judge model; Configure page dropdown; DONE
- [x] **Task 001** — round-by-round scoring via judge model; score badges in Theater + D3 chart in Analytics; DONE
- [x] **Configure page** — `turn_delay_seconds` slider; DONE
- [x] **Settings page polish** — in-app API key configuration, model latency/cost info
- [ ] **Task 004** — Backboard.io memory spike: persistent model memory across experiments (time-boxed investigation)
- [ ] **Browser smoke test** SSE event IDs: open Theater page → Network tab → confirm `id: 1`, `id: 2`, ... per event frame
- [ ] **Browser smoke test** Last-Event-ID: disable network mid-experiment, re-enable → confirm only missed turns replay
- [ ] **Side-by-side comparison view** (Phase 6b) — compare two experiments head-to-head (8–12 h, defer)

### Tracked Tasks (tasks/ directory)
- [x] **[001] Round-by-round scoring** — per-turn evaluation via judge model; score badges in Theater + trends in Analytics → DONE
- [x] **[002] Configurable judge model** — separate referee model for scoring + final verdicts; Configure page dropdown → DONE
- [x] **[003] Per-participant temperature** — independent temperature sliders per model in Configure; stored in DB → `tasks/003-per-participant-temperature.md` ✓ DONE
- [ ] **[004] Backboard.io memory spike** — time-boxed investigation: persistent model memory across experiments → `tasks/004-backboard-memory-spike.md`
- [x] **[005] Conversation CSV export** — Download CSV button in Analytics → DONE (no separate task file; implemented inline)

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
        SeedLab.tsx            Landing page — preset card grid + tag filter + custom card
        Configure.tsx          Experiment config — per-model temp sliders, estimate bar, launch
        Theater.tsx            Pure live-view — SSE stream, split columns, vocab panel
        Dictionary.tsx         WordCard grid + D3 constellation
        Gallery.tsx            Past experiments card grid with status badges
        Analytics.tsx          Per-experiment stats, D3 charts, JSON/markdown/CSV export
        Arena.tsx              Tournament setup — model multi-select, launcher
        Tournament.tsx         Live match grid, leaderboard, radar chart
        Tournaments.tsx        Tournament history list at /tournaments
        Settings.tsx           API key status + model registry + in-app key config
      components/
        theater/               TurnBubble, ThinkingIndicator, RoundDivider, VocabPanel
        dictionary/            WordCard, ConstellationGraph (incremental D3)
        analytics/             VocabGrowthChart, LatencyChart, RadarChart, RoundScoreChart, TokenChart (D3)
        common/                Layout (nav+transitions+glitch), StarField (canvas neural net),
                               ScrambleText, NoiseOverlay, HudBrackets, ErrorBoundary
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
- **Write lock:** `db._write_lock` (asyncio.Lock) initialized in `connect()`, wraps all write methods. Do not bypass it.
- **litellm model strings:** prefix/model format — e.g. `anthropic/claude-sonnet-4-20250514`, `gemini/gemini-2.5-flash`
- **All API keys in Factory `.env`** — copy or symlink for Babel
- **Model allowlist enforced server-side** — relay and tournament routers validate against `MODEL_REGISTRY`
- **Tournament SSE uses `match_id=tournament_id`** — reuses EventHub filter unchanged; individual match events still use their own experiment IDs
- **SSE event IDs:** EventHub assigns monotonic `event_id` in `publish()`. Routers emit `id: N\n` before `data:`. On reconnect, browser sends `Last-Event-ID` header → selective history replay.
- **CSS selector safety** — D3 class names derived from model strings must be sanitized: `label.replace(/[^a-zA-Z0-9_-]/g, '_')`
- **Rounds cap:** Configure = 15, Arena = 15, tournament router `le=15`. Context grows each round — later rounds exponentially slower.
- **Windows:** Use `asyncio.WindowsSelectorEventLoopPolicy()` before any server creation
- **File encoding:** NEVER use PowerShell `Get-Content` to read+rewrite UTF-8 files — it double-encodes multi-byte chars. Always use `win_write` MCP tool for file writes. Use HTML entities (`&mdash;` `&larr;` `&#9671;`) for non-ASCII chars in JSX.
- **Font coverage:** Orbitron (font-display) has NO glyphs for Unicode geometric symbols — always use `font-mono` (JetBrains Mono) on symbol spans
- **StarField:** Pure canvas — not tsParticles. tintColor prop accepts "R,G,B" string. AppInner (inside BrowserRouter) reads route and passes tint.
- **Background task errors:** `_log_task_exception` callback attached to all `asyncio.create_task()` calls in relay_engine.py — silently swallowed exceptions now appear in logs.
- **Per-participant temperature:** `temperature_a` and `temperature_b` stored in experiments table (DEFAULT 0.7). `RelayStartRequest` requires both fields. Tournament mode still uses single temperature (both agents share same value).
- **Judge / scoring:** `judge_model` stored in experiments table (DEFAULT: config.JUDGE_MODEL = gemini-2.5-flash). `enable_scoring` fires `score_turn()` after each turn (fire-and-forget). `enable_verdict` fires `final_verdict()` at end. Both are opt-in toggles in Configure. `turn_scores` table holds per-turn scores. Scoring fails gracefully — turns complete even if judge call errors.