&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-23 (session 4 &mdash; Theater 8-bit revamp + DB fallback fix)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers: Anthropic, Google, OpenAI, DeepSeek, Groq, Cerebras, Mistral, SambaNova, OpenRouter)
- **Real-time:** Server-Sent Events (SSE)
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI v4
- **Visualization:** D3.js 7 (vocabulary constellation + analytics charts + radar chart)
- **Database:** SQLite (WAL mode) &mdash; experiments, turns, vocabulary, tournaments, tournament_matches
- **Testing:** pytest (backend) + vitest (frontend)

## 3. Current State

### Completed (in Factory)
- [x] Working relay engine prototype (`Factory/experiments/ai_relay.py`, 370 lines)
- [x] Smoke test passed (1 round, Claude Sonnet + Gemini Flash, 44s)
- [x] Full 5-round run completed &mdash; 40+ invented words with grammar in 95s
- [x] JSON + Markdown dual transcript output

### Phase 1: Project Scaffold + Backend Core (DONE)
- [x] Python venv + FastAPI skeleton, relay engine, EventHub SSE, SQLite schema, config/model registry
- [x] Gemini Checkpoint 1 &mdash; 4 fixes (keepalive bug, token tracking, null guard, atomic upsert)

### Phase 2: React UI Shell + Theater View (DONE)
- [x] React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI scaffold
- [x] Conversation Theater &mdash; split columns, turn bubbles, thinking states, SSE streaming
- [x] Gemini Checkpoint 2 &mdash; 5 fixes (queue keepalive, O(n2) render, reconnect dedup, auto-scroll, a11y)

### Phase 3: Vocabulary Extractor + Dictionary (DONE)
- [x] Regex vocab extractor, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation
- [x] Gemini Checkpoint 3 &mdash; removed `system_prompt: ''` override

### Phase 4: Seed Lab + Presets (DONE)
- [x] 6 preset YAMLs, SeedLab landing page, Configure page, Theater simplified to pure live-view, nav bar
- [x] Audit fixes: route ordering, resilient preset loader, dynamic Tailwind class fix

### Phase 5: Gallery + Analytics (DONE)
- [x] Gallery at `/gallery` &mdash; card grid, status badges, quick-nav to Theater/Dictionary
- [x] Analytics at `/analytics/:experimentId` &mdash; stats row, D3 vocab growth + latency charts, JSON/markdown export
- [x] Gemini Checkpoint 4 &mdash; 4 fixes (incremental D3 graph, EventHub buffer 200&rarr;2000, async vocab extraction, self-ref parent word filter)

### Phase 6: Arena Mode + Polish (DONE)
- [x] **Tournament engine** &mdash; round-robin runner, sequential match execution, SSE lifecycle events
- [x] **Tournament DB** &mdash; `tournaments` + `tournament_matches` tables, leaderboard aggregation, per-model radar stats
- [x] **Tournament router** &mdash; start/list/detail/leaderboard/stream endpoints; asyncio task storage; model allowlist; query bounds; SSE self-close
- [x] **Arena page** at `/arena` &mdash; model multi-select (min 3, max 10), preset dropdown, live pairing count, tournament launcher
- [x] **Tournament page** at `/tournament/:id` &mdash; live match grid, progress bar, leaderboard table, radar chart overlay
- [x] **RadarChart** &mdash; D3 spider chart (verbosity/speed/creativity/consistency/engagement), multi-model polygon overlay
- [x] **Settings page** at `/settings` &mdash; live API key status indicators + model registry table
- [x] **"The Original" preset** &mdash; recreate viral Reddit Claude vs Gemini experiment (15 rounds, exact seed words)
- [x] **Relay router** &mdash; model allowlist validation, `/models/status` endpoint
- [x] **Audit hardening** &mdash; DB normalization zero-collapse fix, consistency metric inversion, error message sanitization, query bounds across all routers
- [x] **README** &mdash; quick start, architecture, presets table, model support
- [x] **Bug fixes** &mdash; LatencyChart CSS selector crash (dots in model names), copy markdown silent failure &rarr; execCommand fallback + Copied!/Failed feedback
- [x] Build passes: 2456 modules, 0 errors

### Phase 7: Sci-Fi Observatory UI/UX (DONE)
- [x] **Design system** &mdash; Orbitron (display), Inter (UI), JetBrains Mono (conversation) fonts; amber/cyan model colors; CSS glow tokens
- [x] **StarField** &mdash; tsParticles ambient star field, 160 particles, always-on behind all pages
- [x] **Theater reactive canvas** &mdash; pulse rings + 12-dot vocab bursts per turn (TheaterCanvas.tsx), column glow on thinking, nav border transitions via data-active-model attribute
- [x] **SeedLab animations** &mdash; Framer Motion staggered card entrances (100ms), heading fade-up, hover scale + accent glow
- [x] **Backend** &mdash; turn_delay_seconds param (default 2.0s) in relay engine so animations are visible between turns
- [x] **Framer Motion + tsParticles** installed (framer-motion 12.x, @tsparticles/react + @tsparticles/slim)

### Phase 8: Full Neural Design System (DONE)
- [x] **Global typography** &mdash; all h1/h2 &rarr; Orbitron uppercase via CSS; `.neural-section-label` monospace headers
- [x] **NoiseOverlay.tsx** &mdash; CSS grain texture over entire viewport (opacity ~2%)
- [x] **HudBrackets.tsx** &mdash; corner bracket decoration for preset cards
- [x] **BABEL shimmer** &mdash; chromatic shimmer animation on wordmark in Layout
- [x] **Neural card classes** &mdash; `.neural-card`, `.neural-row` + status variants (left-stripe colored), `.status-dot` + variants
- [x] **`.neural-btn`**, **`.neural-provider`** (left-stripe Settings panels), **`.neural-section-label`**
- [x] **Gallery** &rarr; terminal log rows with left-stripe color per status
- [x] **Arena** &rarr; neural terminal panel with `// section_labels`
- [x] **Configure** &rarr; geometric symbols, section labels, SYMBOL_MAP (emoji &rarr; geometric)
- [x] **Settings** &rarr; left-stripe provider panels, status dots, key status
- [x] **SeedLab** &rarr; emoji replaced with geometric symbols via SYMBOL_MAP + FALLBACK_SYMBOLS
- [x] **Layout** &rarr; Orbitron monospace nav links

### Phase 9: Living Neural Network (DONE)
- [x] **StarField rewrite** &mdash; pure canvas (replaces tsParticles); 3 depth layers (0.25/0.62/1.0) with mouse parallax; cascade pulses (4 hops, purple&rarr;cyan&rarr;amber&rarr;white); route-aware RGB lerp tint
- [x] **ScrambleText.tsx** &mdash; ASCII-only glyph scramble on mount, left-to-right reveal, 2000ms duration
- [x] **Page transitions** &mdash; AnimatePresence blur-fade in Layout.tsx, keyed by pathname
- [x] **BABEL glitch** &mdash; 4-frame chromatic aberration every 9&ndash;22s on wordmark
- [x] **Route-aware tint** &mdash; AppInner reads useLocation(), maps route &rarr; RGB, passes to StarField
- [x] **ScrambleText applied** to all 5 pages (SeedLab, Gallery, Arena, Configure, Settings)
- [x] **Synaptic bloom** (#3) &mdash; nodes accumulate screen-blend halo (42&ndash;104px) on pulse arrival; decays ~5.5s
- [x] **Activity trails** (#5) &mdash; edges glow thicker/brighter for ~1.4s after carrying a pulse
- [x] **Gamma burst events** (#7) &mdash; 12-node synchronized fire every 15&ndash;40s; expanding ring visual
- [x] **Encoding fix** &mdash; rewrote all 5 pages via win_write to fix PowerShell UTF-8 double-encoding artifacts; HTML entities for all non-ASCII JSX chars

### Gemini Audit Hardening (DONE)
- [x] **`server/db.py`** &mdash; `asyncio.Lock` write lock; all 7 write methods wrapped
- [x] **`server/relay_engine.py`** &mdash; `_log_task_exception()` callback on all `create_task()` calls
- [x] **`server/event_hub.py`** &mdash; monotonic `event_id` counter; `subscribe()` accepts `last_event_id` for selective replay
- [x] **`server/routers/relay.py`** &mdash; SSE emits `id: N\n`; reads `Last-Event-ID` on reconnect
- [x] **`server/routers/tournaments.py`** &mdash; same SSE id + Last-Event-ID treatment
- [x] **Browser smoke test** &mdash; SSE event IDs confirmed in Network tab (`id: 1`, `id: 2`, ... per frame)
- [ ] **Browser smoke test** &mdash; Last-Event-ID reconnect: disable network mid-experiment, re-enable &rarr; confirm only missed turns replay

### Task 003: Per-Participant Temperature (DONE)
- [x] **`server/db.py`** &mdash; idempotent `ALTER TABLE` migrations for `temperature_a` / `temperature_b` (DEFAULT 0.7); `create_experiment()` stores both
- [x] **`server/routers/relay.py`** &mdash; `RelayStartRequest` split `temperature` &rarr; `temperature_a` + `temperature_b`; each `RelayAgent` gets its own temp
- [x] **`ui/src/api/types.ts`** &mdash; `RelayStartRequest` + `ExperimentRecord` updated
- [x] **`ui/src/pages/Configure.tsx`** &mdash; two per-model temperature sliders (amber = A, cyan = B); `presetDefaults`, `hasParamChanges`, `handleResetParams`, `handleLaunch` all updated
- [x] **`ui/src/pages/Analytics.tsx`** &mdash; conditional Temp A / Temp B stat cards (guarded by `!= null` for backwards compat)

### Configure Page Polish (DONE)
- [x] **Pre-launch estimate bar** &mdash; displays `~Xm Xs` and `&le;X tokens` above Launch button, computed live from rounds &times; 2 &times; (6s + turnDelay) and rounds &times; 2 &times; maxTokens

### SeedLab Tag Filtering (DONE)
- [x] **Tag chip row** &mdash; `allTags` derived from preset metadata; `activeTag` state filters `visiblePresets`; "all" chip resets filter; active chip styled with accent border

### Task 005: CSV Export (DONE)
- [x] **`ui/src/pages/Analytics.tsx`** &mdash; "Download CSV" button; exports `round,speaker,model,content,latency_seconds,token_count`; content cells RFC-4180 quoted

### Phase 10: 8-bit Theater Revamp (DONE)
- [x] **SpriteAvatar.tsx** (NEW) &mdash; pure SVG pixel-art avatar; 6 states: idle (float+blink), thinking (scan bar), talking (eye pulse), error (red X+shake), winner (gold bounce), loser (red dim+shake); amber=model-a / cyan=model-b
- [x] **TypewriterText.tsx** (NEW) &mdash; char-by-char reveal on latest live turn only; past turns instant; blinking cursor; `onComplete` callback
- [x] **ArenaStage.tsx** (NEW) &mdash; HUD bracket frame, `// ARENA` label, sprites + VS divider, preset-tinted gradient background, STATUS_LABELS per state
- [x] **TurnBubble.tsx** &mdash; rewritten: left-stripe terminal styling, scanline texture, `[R.N]` round tag, TypewriterText for latest turn
- [x] **ConversationColumn.tsx** &mdash; header replaced by 2px gradient accent bar; `latestTurnId` prop added
- [x] **Theater.tsx** &mdash; ArenaStage row, `talkingSpeaker` state + timeout, `latestTurnId`, sprite status derivation, verdict beat with TypewriterText reveal
- [x] **Bug fix: Theater empty on revisit** &mdash; when `api.getExperiment` returns completed/stopped, also fetches `api.getExperimentTurns` + `api.getExperimentScores`; converts DB records to SSE event format; `effectiveTurns`/`effectiveScores` prefer SSE, fall back to DB (root cause: EventHub history is in-memory, lost on server restart)

### Next Up
- [x] **Task 002** &mdash; configurable judge model; Configure page dropdown; DONE
- [x] **Task 001** &mdash; round-by-round scoring via judge model; score badges in Theater + D3 chart in Analytics; DONE
- [x] **Configure page** &mdash; `turn_delay_seconds` slider; DONE
- [x] **Settings page polish** &mdash; in-app API key configuration, model latency/cost info
- [ ] **Task 004** &mdash; Backboard.io memory spike: persistent model memory across experiments (time-boxed investigation)
- [ ] **Browser smoke test** &mdash; Last-Event-ID reconnect: disable network mid-experiment, re-enable &rarr; confirm only missed turns replay
- [ ] **Verdict persistence** &mdash; verdict (winner + reasoning) not stored in DB; lost on server restart (low priority)
- [ ] **Theater cohesion backlog** &mdash; sprites in Gallery/Analytics mini icons; typewriter in Configure estimate bar; BABEL glitch during live match; preset color threading full app (Option C)
- [ ] **Side-by-side comparison view** (Phase 6b) &mdash; compare two experiments head-to-head (8&ndash;12 h, defer)

### Tracked Tasks (tasks/ directory)
- [x] **[001] Round-by-round scoring** &mdash; per-turn evaluation via judge model; score badges in Theater + trends in Analytics &rarr; DONE
- [x] **[002] Configurable judge model** &mdash; separate referee model for scoring + final verdicts; Configure page dropdown &rarr; DONE
- [x] **[003] Per-participant temperature** &mdash; independent temperature sliders per model in Configure; stored in DB &rarr; `tasks/003-per-participant-temperature.md` &#10003; DONE
- [ ] **[004] Backboard.io memory spike** &mdash; time-boxed investigation: persistent model memory across experiments &rarr; `tasks/004-backboard-memory-spike.md`
- [x] **[005] Conversation CSV export** &mdash; Download CSV button in Analytics &rarr; DONE (no separate task file; implemented inline)

## 4. Architecture
```
Babel/
  server/
    app.py                     FastAPI app &mdash; mounts relay, experiments, presets, tournaments routers
    config.py                  Settings, model registry (7 models across 5 providers)
    presets.py                 YAML preset loader (resilient, logs malformed files)
    relay_engine.py            Core relay loop &mdash; call_model, build_messages, vocab extraction
    tournament_engine.py       Round-robin tournament runner &mdash; sequential matches, SSE events
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
      collab-svg.yaml          Collaborative SVG drawing (Infinite Canvas)
      prisoners-dilemma.yaml   Cooperate or betray high-stakes negotiation
      syntax-virus.yaml        Models add mandatory formatting rules; break one = language degrades
      taboo-artifact.yaml      Describe a common object without obvious words (The Artifact)
    routers/
      relay.py                 POST /start (+ preset resolution + model validation), GET /stream (SSE), GET /models/status
      experiments.py           GET list/detail/vocabulary/stats/turns/radar
      presets.py               GET list/detail
      tournaments.py           POST /start, GET list/detail/leaderboard/stream
  ui/
    src/
      pages/
        SeedLab.tsx            Landing page &mdash; preset card grid + tag filter + custom card
        Configure.tsx          Experiment config &mdash; per-model temp sliders, estimate bar, launch
        Theater.tsx            Pure live-view &mdash; SSE stream, split columns, vocab panel
        Dictionary.tsx         WordCard grid + D3 constellation
        Gallery.tsx            Past experiments card grid with status badges
        Analytics.tsx          Per-experiment stats, D3 charts, JSON/markdown/CSV export
        Arena.tsx              Tournament setup &mdash; model multi-select, launcher
        Tournament.tsx         Live match grid, leaderboard, radar chart
        Tournaments.tsx        Tournament history list at /tournaments
        Settings.tsx           API key status + model registry + in-app key config
      components/
        theater/               SpriteAvatar, TypewriterText, ArenaStage, TurnBubble, ConversationColumn, ThinkingIndicator, RoundDivider, VocabPanel, TheaterCanvas
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
- **Origin:** Inspired by https://www.reddit.com/r/ClaudeAI/comments/1rb9dpr/ &mdash; human relayed messages between Claude + Gemini until they invented SYNTHOLINK language
- **Standalone:** All backend code is self-contained. Zero cross-repo dependencies.
- **SQLite:** aiosqlite with `journal_mode=WAL` + `foreign_keys=ON` + `synchronous=NORMAL`
- **Write lock:** `db._write_lock` (asyncio.Lock) initialized in `connect()`, wraps all write methods. Do not bypass it.
- **litellm model strings:** prefix/model format &mdash; e.g. `anthropic/claude-sonnet-4-20250514`, `gemini/gemini-2.5-flash`
- **All API keys in Factory `.env`** &mdash; copy or symlink for Babel
- **Model allowlist enforced server-side** &mdash; relay and tournament routers validate against `MODEL_REGISTRY`
- **Tournament SSE uses `match_id=tournament_id`** &mdash; reuses EventHub filter unchanged; individual match events still use their own experiment IDs
- **SSE event IDs:** EventHub assigns monotonic `event_id` in `publish()`. Routers emit `id: N\n` before `data:`. On reconnect, browser sends `Last-Event-ID` header &rarr; selective history replay.
- **CSS selector safety** &mdash; D3 class names derived from model strings must be sanitized: `label.replace(/[^a-zA-Z0-9_-]/g, '_')`
- **Rounds cap:** Configure = 15, Arena = 15, tournament router `le=15`. Context grows each round &mdash; later rounds exponentially slower.
- **Windows:** Use `asyncio.WindowsSelectorEventLoopPolicy()` before any server creation
- **File encoding:** NEVER use PowerShell `Get-Content` to read+rewrite UTF-8 files &mdash; it double-encodes multi-byte chars. Always use `win_write` MCP tool for file writes. Use HTML entities (`&mdash;` `&larr;` `&#9671;`) for non-ASCII chars in JSX.
- **Font coverage:** Orbitron (font-display) has NO glyphs for Unicode geometric symbols &mdash; always use `font-mono` (JetBrains Mono) on symbol spans
- **StarField:** Pure canvas &mdash; not tsParticles. tintColor prop accepts "R,G,B" string. AppInner (inside BrowserRouter) reads route and passes tint.
- **Background task errors:** `_log_task_exception` callback attached to all `asyncio.create_task()` calls in relay_engine.py &mdash; silently swallowed exceptions now appear in logs.
- **Per-participant temperature:** `temperature_a` and `temperature_b` stored in experiments table (DEFAULT 0.7). `RelayStartRequest` requires both fields. Tournament mode still uses single temperature (both agents share same value).
- **Theater DB fallback:** EventHub history is in-memory; server restart wipes it. Theater.tsx fetches `api.getExperimentTurns` + `api.getExperimentScores` for completed experiments as fallback. Verdict (winner + reasoning) is NOT persisted &mdash; still lost on restart.
- **Theater sprites:** `SpriteAvatar` clipPath IDs are `face-clip-model-a` / `face-clip-model-b` (unique per color to avoid SVG collision). `talkingSpeaker` uses a timeout keyed on `lastTurn.turn_id` &mdash; no callback threading needed. `latestTurnId` is null for completed experiments (typewriter only fires live).
- **Judge / scoring:** `judge_model` stored in experiments table (DEFAULT: config.JUDGE_MODEL = gemini-2.5-flash). `enable_scoring` fires `score_turn()` after each turn (fire-and-forget). `enable_verdict` fires `final_verdict()` at end. Both are opt-in toggles in Configure. `turn_scores` table holds per-turn scores. Scoring fails gracefully &mdash; turns complete even if judge call errors.
