# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-25 (session 16 checkpoint &mdash; bracket overreach guard fixed, Groq rerun script ready)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers: Anthropic, Google, OpenAI, DeepSeek, Groq, Cerebras, Mistral, SambaNova, OpenRouter)
- **Real-time:** Server-Sent Events (SSE)
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI v4
- **Visualization:** D3.js 7 (vocabulary constellation + analytics charts + radar chart)
- **Database:** SQLite (WAL mode) &mdash; experiments, turns, vocabulary, tournaments, tournament_matches, model_memory, personas
- **Testing:** pytest (backend) + vitest (frontend)

## 3. Current State

Phases 1&ndash;16 shipped. See `docs/CHANGELOG.md` for full history.

### Phase 16 Verification (still pending)
- [ ] **Commit Phase 16** &mdash; stage all modified/new files and commit
- [ ] **Runtime smoke test** &mdash; 3-way relay test (Configure 3-agent &rarr; Theater 3-column render &rarr; round-robin order check)
- [ ] **Persona end-to-end test** &mdash; create persona in Settings &rarr; assign in Configure &rarr; verify system prompt injection
- [ ] **Documentary test (standard)** &mdash; Analytics &rarr; "View Documentary" &rarr; verify generation + caching
- [ ] **Documentary test (RPG)** &mdash; complete RPG session &rarr; "Generate Recap" button &rarr; fantasy-chronicler narrative
- [ ] **Campaign persistence test** &mdash; run RPG session #1 &rarr; run #2 with same preset+DM model &rarr; verify "CAMPAIGN HISTORY:" in DM prompt

### RPG Pattern Research (session 16)
- [x] **Narrator discipline guard** added to `DEFAULT_RPG_SYSTEM_PROMPT` in `server/config.py` (addresses P10 + P11 first-person capture)
- [x] **Bracket overreach guard** added to `DEFAULT_RPG_SYSTEM_PROMPT` &mdash; prohibits `[Character]:` labeled turns in DM narration (P10 sub-pattern, model-agnostic)
- [x] **Stress test batch** &mdash; 13 sessions run via `rpg_stress_runner.py`; 8 completed, 5 failed (Groq 100k/day TPD)
- [x] **40-session corpus** fully analyzed &mdash; all session logs have completed `## Observations` sections
- [x] **P7 PROMOTED** &mdash; adversarial > aligned drama confirmed (7ef09c722ac4 vs 10e6bd913417)
- [x] **P8 PROMOTED** &mdash; GPT-4o-mini healer overreach confirmed 5/5 rounds (791ff6ecb8e9)
- [x] **P13 PROMOTED** &mdash; Deepseek 6/6 rounds deception, 8 techniques, secondary objective covert (f51da46eb6ef)
- [x] **P10 regression** &mdash; first-person guard working; bracket overreach sub-pattern documented + now fixed
- [x] **P12 exception tested** &mdash; zero-sum framing delays but doesn't prevent cooperative drift (9fdf7133db2d)
- [x] **rpg_groq_rerun.py** written &mdash; 5 failed sessions ready to run with Groq dev sub
- [ ] **Run Groq rerun batch** &mdash; kill zombie Python first, then start server + run rpg_groq_rerun.py
- [ ] **Analyze 5 new logs** &mdash; P1 decay zone, P6 (Deepseek/Groq DM), P9 verbosity, P11 regression
- [ ] **Phase 17 implementation** &mdash; RPG context management; Pre-Flight Injector

### Tracked Tasks (tasks/ directory)
- [x] **001** Round-by-round scoring &mdash; DONE
- [x] **002** Configurable judge model &mdash; DONE
- [x] **003** Per-participant temperature &mdash; DONE
- [x] **004** DIY model memory &mdash; DONE
- [x] **005** CSV export &mdash; DONE

## 4. Architecture
```
Babel/
  server/
    app.py                     FastAPI app &mdash; mounts relay, experiments, presets, tournaments, personas routers
    config.py                  Settings, model registry; DEFAULT_RPG_SYSTEM_PROMPT has narrator guard + bracket overreach guard
    presets.py                 YAML preset loader (resilient, logs malformed)
    relay_engine.py            Core relay loop &mdash; call_model, build_messages, vocab extraction
    rpg_engine.py              RPG mode &mdash; human-yielding loop, DM+player+AI party
    tournament_engine.py       Round-robin tournament runner
    vocab_extractor.py         Regex-based invented word detection
    db.py                      SQLite schema + queries (all tables)
    event_hub.py               SSE pub/sub (standalone, match_id filtering)
    presets/                   11 YAML preset files
    routers/
      relay.py                 /start, /stream (SSE), /models/status, /pause, /resume, /inject
      experiments.py           list/detail/vocabulary/stats/turns/radar; POST documentary
      presets.py               list/detail
      tournaments.py           start/list/detail/leaderboard/stream
      personas.py              CRUD /api/personas
  ui/src/
    pages/                     SeedLab, Configure, Theater, RPGTheater, Dictionary, Gallery,
                               Analytics, Documentary, Arena, Tournament, Tournaments, Settings, BranchTree
    components/
      theater/                 SpriteAvatar, TypewriterText, ArenaStage, TurnBubble, ConversationColumn,
                               ThinkingIndicator, RoundDivider, VocabPanel, TheaterCanvas, RPGTheater, HumanInput
      dictionary/              WordCard, ConstellationGraph, VocabBurstChart
      analytics/               VocabGrowthChart, LatencyChart, RadarChart, RoundScoreChart, TokenChart
      common/                  Layout, StarField, ScrambleText, NoiseOverlay, HudBrackets, ErrorBoundary
      ui/                      9 Shadcn primitives
    api/                       types.ts, client.ts (19+ endpoints), sse.ts (useSSE), hooks.ts (useExperimentState)
    lib/                       presetColors.ts, format.ts, symbols.ts, prefs.ts
  docs/
    CHANGELOG.md               Completed phases 1-16 history
    IMPLEMENTATION_NOTES.md    Detailed subsystem reference (SSE, scoring, sprites, RPG, forking, N-way, etc.)
  gameplay-observations/
    session-logs/              40 session log files &mdash; all have completed ## Observations sections
    confirmed-patterns.md      P2, P4, P5, P7, P8, P9, P10, P12, P13 confirmed (9 total)
    deferred-patterns.md       P1 (8r zone), P6 (2 more DMs needed), P11 (regression needed); P14 candidate
  rpg_groq_rerun.py            5-session rerun for Groq TPD failures (ready to run with dev sub)
```

## 5. Routes
`/` SeedLab | `/configure/:presetId` Configure | `/theater/:matchId` Theater | `/rpg/:matchId` RPGTheater | `/dictionary/:experimentId` Dictionary | `/gallery` Gallery | `/analytics/:experimentId` Analytics | `/documentary/:experimentId` Documentary | `/arena` Arena | `/tournament/:id` Tournament | `/tournaments` list | `/tree/:experimentId` BranchTree | `/settings` Settings

## 6. Commands (PowerShell)
```powershell
# Backend
&amp; ".\.venv\Scripts\python.exe" -m uvicorn server.app:app --reload --port 8000

# Frontend (dev)
Set-Location ui &amp;&amp; .\run_npm.cmd dev

# Tests
&amp; ".\.venv\Scripts\python.exe" -m pytest tests/ -v
```

## 7. "Don't Forget" Rules
- **Origin:** Inspired by https://www.reddit.com/r/ClaudeAI/comments/1rb9dpr/ &mdash; human relayed messages between Claude + Gemini until they invented SYNTHOLINK language
- **Standalone:** All backend code is self-contained. Zero cross-repo dependencies.
- **SQLite:** aiosqlite with `journal_mode=WAL` + `foreign_keys=ON` + `synchronous=NORMAL`
- **Write lock:** `db._write_lock` (asyncio.Lock) initialized in `connect()`, wraps all write methods. Do not bypass.
- **litellm model strings:** prefix/model format &mdash; e.g. `anthropic/claude-sonnet-4-20250514`, `gemini/gemini-2.5-flash`
- **All API keys in Factory `.env`** &mdash; copy or symlink for Babel
- **Model allowlist enforced server-side** &mdash; relay and tournament routers validate against `MODEL_REGISTRY`
- **Rounds cap:** Configure = 15, Arena = 15, tournament router `le=15`. Context grows each round &mdash; later rounds exponentially slower.
- **Windows:** Use `asyncio.WindowsSelectorEventLoopPolicy()` before any server creation
- **Idempotent migrations:** All ALTER TABLE in db.py uses try/except OperationalError pattern
- **Background task errors:** `_log_task_exception` callback attached to all `asyncio.create_task()` calls
- **Preset colors:** `ui/src/lib/presetColors.ts` is the single source &mdash; add new preset colors there
- **Bad model ID:** `anthropic/claude-haiku-3-5-20251022` is INVALID &mdash; correct is `claude-haiku-4-5-20251001`

For detailed subsystem notes (SSE reconnect, scoring, sprites, RPG, forking, N-way agents, etc.), see `docs/IMPLEMENTATION_NOTES.md`
