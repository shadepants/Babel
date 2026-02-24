&#xFEFF;# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-23 (session 11 &mdash; Phase 15 N-way conversations + branch tree implemented)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers: Anthropic, Google, OpenAI, DeepSeek, Groq, Cerebras, Mistral, SambaNova, OpenRouter)
- **Real-time:** Server-Sent Events (SSE)
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI v4
- **Visualization:** D3.js 7 (vocabulary constellation + analytics charts + radar chart)
- **Database:** SQLite (WAL mode) &mdash; experiments, turns, vocabulary, tournaments, tournament_matches, model_memory
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
- [x] **Bug fix: Theater empty on revisit** &mdash; DB fallback for completed experiments (turns + scores); `effectiveTurns`/`effectiveScores` prefer SSE, fall back to DB

### Task 004: DIY Model Memory (DONE)
- [x] **`server/db.py`** &mdash; `model_memory` table (pair-keyed on sorted model names); `create_memory()`, `get_memories_for_pair()`, `generate_memory_summary()` (deterministic vocab-based, no extra LLM call)
- [x] **`server/relay_engine.py`** &mdash; `enable_memory` param; memory injected into system prompts at start; saved as background task after verdict
- [x] **`server/routers/relay.py`** &mdash; `enable_memory: bool` in `RelayStartRequest`
- [x] **`ui/src/api/types.ts`** &mdash; `enable_memory?: boolean` on `RelayStartRequest`
- [x] **`ui/src/pages/Configure.tsx`** &mdash; Memory toggle UI section
- [x] **`tasks/004-backboard-memory-spike-results.md`** &mdash; spike results doc (backboard.io scored 10/25; DIY chosen: free, private, deterministic)

### Session 5: Verdict Persistence + Theater Cohesion (DONE)
- [x] **Verdict persistence** &mdash; `winner` + `verdict_reasoning` columns added to experiments table (idempotent migration); `save_verdict()` in db.py
- [x] **`server/relay_engine.py`** &mdash; `final_verdict()` now takes `db` param; calls `save_verdict()` after hub publish; logs "Verdict saved for [match_id]"
- [x] **`ui/src/api/types.ts`** &mdash; `winner?: string | null` + `verdict_reasoning?: string | null` on `ExperimentRecord`
- [x] **`ui/src/pages/Theater.tsx`** &mdash; `dbVerdict` state; loaded from `exp.winner`/`exp.verdict_reasoning` in DB fallback block; `effectiveVerdict = experiment.verdict ?? dbVerdict`; used throughout sprites + render
- [x] **`ui/src/lib/presetColors.ts`** (NEW) &mdash; extracted `PRESET_GLOW` map + `getPresetGlow()` helper; shared by ArenaStage, Gallery, Configure
- [x] **`ui/src/components/theater/ArenaStage.tsx`** &mdash; removed local `PRESET_GLOW`; imports from `@/lib/presetColors`
- [x] **`ui/src/pages/Gallery.tsx`** &mdash; mini `SpriteAvatar` (size 28) beside each model name; outcome-aware sprite states; preset left border stripe via `getPresetGlow`
- [x] **`ui/src/pages/Analytics.tsx`** &mdash; mini `SpriteAvatar` (size 40) flanking model names in header; outcome-aware states
- [x] **`ui/src/pages/Configure.tsx`** &mdash; preset `borderTop` accent on config form card via `getPresetGlow` (alpha boosted to 0.70)
- [x] **`ui/src/components/common/Layout.tsx`** &mdash; listens for `CustomEvent('babel-glitch')` on window; fires `runGlitch()` immediately
- [x] **`ui/src/pages/Theater.tsx`** &mdash; dispatches `babel-glitch` event on each turn arrival (live experiments only)
- [x] **TypeScript check** &mdash; `tsc --noEmit` exits 0, zero errors

### Phase 11: Quick Wins &amp; Polish (DONE)
- [x] **Experiment nickname** &mdash; `label TEXT` column in experiments table (idempotent migration); `set_label()` in db.py; `PATCH /experiments/{id}/label` endpoint; `label?` field on `ExperimentRecord`; `setExperimentLabel()` in client.ts
- [x] **Analytics inline editor** &mdash; click `// add nickname...` to edit in-place (Enter/Escape/save/cancel); updates local state optimistically
- [x] **Gallery label display** &mdash; experiment label shown in metadata row when present
- [x] **Tab title live state** &mdash; Theater.tsx: `&#9679; R.N | Babel` while running, `&#10003; Done | Babel` on complete; resets to `Babel` on unmount
- [x] **Hover timestamps on TurnBubble** &mdash; hover the latency badge to switch from `Xs` to wall-clock time (toLocaleTimeString)
- [x] **Vocab inline linking** &mdash; `linkifyVocab()` in TurnBubble wraps coined words in `&lt;Link&gt;` to `/dictionary/:id#word-{slug}`; skips `isLatest` turn (TypewriterText still active); Dictionary.tsx adds `id` anchors
- [x] **Model A&harr;B swap button** &mdash; `&#8646; swap` button in Configure model_selection header; swaps both models and temperatures atomically
- [x] **Remix button** &mdash; Gallery + Analytics buttons navigate to `/configure/:presetId?remix=<id>`; Configure reads `?remix=` param, fetches that experiment, pre-fills models/temps/seed
- [x] **effectiveVocab pattern** &mdash; Theater.tsx: SSE vocab events preferred, falls back to DB `api.getVocabulary()` for completed experiments; maps VocabWord &rarr; VocabEvent shape

### Phase 12: Dictionary Revamp (DONE)
- [x] **Stats row** &mdash; word count, unique speakers, vocabulary growth rate (words/round), most active speaker
- [x] **Search/filter/sort** &mdash; Shadcn Combobox (prefix match), Checkbox filter by speaker origin (A/B/Human), Sort dropdown (frequency/recency/alphabetical)
- [x] **Constellation upgrades** &mdash; D3 force-directed graph (forces: repulsion, link, center); hoverable nodes; click node &rarr; highlight connected vocabulary
- [x] **Swimlane timeline** &mdash; horizontal bar chart (words by round); hover bar &rarr; highlight words in that round; supports Human-origin words

### Phase 13: Interactive Experiments (DONE)
- [x] **Pause/Resume** &mdash; `resume_event: asyncio.Event` per relay (initially set, pause clears, resume sets); checkpoints before each turn; history refresh from DB on resume; SSE `PAUSED`/`RESUMED` events
- [x] **Human Turn Injection** &mdash; POST `/api/relay/{match_id}/inject` endpoint; validates paused state; saves to DB with `speaker="Human"`; republishes as `relay.turn` SSE event; no DB schema changes
- [x] **Observer/Narrator Model** &mdash; optional third model; configurable interval (1-10 turns); fire-and-forget `_observe()` task; fires every N turns; inline card rendering in Theater (centered, full-width)
- [x] **New SSE events** &mdash; `RelayEvent.PAUSED`, `RelayEvent.RESUMED`, `RelayEvent.OBSERVER` constants
- [x] **3-tuple registry** &mdash; `_running_relays` extended from (task, cancel_event) to (task, cancel_event, resume_event)
- [x] **Configure form** &mdash; observer model dropdown (default "none"), observer interval slider (1-10, default 3)
- [x] **Theater controls** &mdash; Pause/Resume buttons (yellow/accent), Inject textarea (visible when paused), Inject button, Stop button; observer events render inline
- [x] **TypeScript check** &mdash; `tsc --noEmit` exits 0, zero errors

### Phase 13b: Virtual Tabletop RPG Mode (DONE)
- [x] **RPG Engine** &mdash; `server/rpg_engine.py` (NEW, ~175 lines): human-yielding loop; DM (AI) narrates, Player (human) types actions; AI party members participate; cancel_event support
- [x] **DB migrations** &mdash; `mode`, `participants_json` columns on experiments; `metadata` on turns; `create_experiment()` accepts new params
- [x] **App state** &mdash; `app.state.human_events = {}` per-match asyncio.Event registry for RPG human yielding
- [x] **RelayEvent.AWAITING_HUMAN** &mdash; new SSE event constant in relay_engine.py
- [x] **Relay router** &mdash; mode branching in POST `/start` (rpg vs standard); dual-mode POST `/inject` (checks human_events first for RPG, falls back to standard pause inject)
- [x] **Frontend types** &mdash; `AwaitingHumanEvent` interface; `mode`/`participants` on request types; `isAwaitingHuman` state in hooks
- [x] **HumanInput.tsx** (NEW) &mdash; emerald-glowing command input bar; POST inject with speaker param
- [x] **RPGTheater.tsx** (NEW) &mdash; full RPG session view; party roster sidebar; chronological chat log; role-colored speakers (DM=amber, Player=emerald, AI=cyan)
- [x] **Configure.tsx** &mdash; RPG mode toggle; party member builder (name + role + model); "Begin Campaign" launch; navigates to `/rpg/:matchId`
- [x] **App.tsx** &mdash; `/rpg/:matchId` route; emerald tint for RPG routes
- [x] **TypeScript check** &mdash; `tsc --noEmit` exits 0, zero errors

### Phase 14: Cross-Experiment Intelligence (DONE)
- [x] **14-A VocabBurstChart** &mdash; `VocabBurstChart.tsx` (NEW): pure-SVG per-round coinage bars; burst detection (mean + 1.5&sigma;) highlights amber rounds; click bar &rarr; onSelectWord; ResizeObserver responsive; 4th `burst` tab added to Dictionary.tsx
- [x] **14-B Experiment Forking** &mdash; DB migrations (`parent_experiment_id`, `fork_at_round`); `create_experiment()` updated; `run_relay()` accepts `initial_history`; `RelayStartRequest` fork fields; Theater.tsx Fork button; Configure.tsx `?fork=` param + banner + forkHistory
- [x] **14-C Cross-Run Provenance** &mdash; DB migration (`origin_experiment_id` on vocabulary); `tag_word_origins()` in db.py; relay fires as background task at end; WordCard.tsx `[INHERITED]` badge linking to parent analytics
- [x] **TypeScript check** &mdash; `tsc --noEmit` exits 0, zero errors
- [x] **Python syntax** &mdash; `py_compile` on db.py, relay_engine.py, routers/relay.py: OK

### Phase 15: New Conversation Structures (DONE)
- [x] **15-A backend** &mdash; `agents_config_json` column; N-agent relay loop; tagged turns `[AgentName]: `; `get_experiment_tree()` recursive CTE; `GET /api/experiments/{id}/tree` endpoint
- [x] **15-A frontend** &mdash; `AgentConfig` + `TreeNode` types; `getExperimentTree` client; `AGENT_COLORS` palette; N-column Theater; N-agent Configure (add/remove up to 4); `resolveWinnerIndex` handles legacy + new speaker strings
- [x] **15-B** &mdash; `BranchTree.tsx` D3 horizontal tree (new page); `/tree/:experimentId` route + violet tint; "View Tree" button in Analytics; Theater Tree link button
- [x] **TypeScript check** &mdash; `tsc --noEmit` exits 0, zero errors
- [x] **Python syntax** &mdash; `py_compile` on all 4 backend files: OK

### Next Up
- [ ] **Commit Phase 14 + 15** &mdash; large staged commit (or two separate)
- [ ] **Runtime smoke test** &mdash; kill zombie Python, start server, test 3-way launch + Theater 3 columns + branch tree page
- [ ] **2-way backward compat check** &mdash; old experiments still load in Theater (legacy speaker strings)
- [ ] **RPG smoke test** &mdash; kill zombie Python processes in Task Manager first, then start server, test RPG + standard flow end-to-end
- [ ] **RPG SAO metadata** &mdash; populate `metadata` column with structured Subject-Action-Object events from DM (DF SIM Finding #6; column already exists)
- [ ] **RPG campaign recap** &mdash; parse metadata into narrative summary page after session ends
- [ ] **RPG campaign persistence** &mdash; DM remembers past sessions via model_memory (DF SIM Finding #4 LOD tiers)

### Roadmap &mdash; Phases 15&ndash;16

| Phase | Theme | Effort | Key Features |
|-------|-------|--------|--------------|
| **~~11~~** | ~~Quick Wins &amp; Polish~~ | ~~done~~ | ~~Remix button, tab title, hover timestamps, vocab linking, model swap, nickname~~ |
| **~~12~~** | ~~Dictionary Revamp~~ | ~~done~~ | ~~Stats bar, search/filter/sort, constellation upgrades, swimlane timeline~~ |
| **~~13~~** | ~~Interactive Experiments~~ | ~~done~~ | ~~Pause/resume, inject human turn, observer/narrator model~~ |
| **~~13b~~** | ~~Virtual Tabletop RPG~~ | ~~done~~ | ~~RPG engine, human-in-the-loop, party builder, RPGTheater~~ |
| **~~14~~** | ~~Cross-Experiment Intelligence~~ | ~~done~~ | ~~Vocab burst chart, experiment forking, cross-run vocabulary provenance~~ |
| **~~15~~** | ~~New Conversation Structures~~ | ~~done~~ | ~~N-way conversations (3&ndash;4 models), conversation branch tree (D3)~~ |
| **16** | Depth &amp; Legacy | 1&ndash;3 wk | Conlang export, AI documentary, persistent personas, public deploy |

**Recommended next:** Commit Phase 14 &rarr; RPG smoke test (deferred since session 9) &rarr; Phase 15

**RPG follow-ups (still deferred):** runtime smoke test, SAO metadata, campaign recap, campaign persistence

### Tracked Tasks
 (tasks/ directory)
- [x] **[001] Round-by-round scoring** &mdash; per-turn evaluation via judge model; score badges in Theater + trends in Analytics &rarr; DONE
- [x] **[002] Configurable judge model** &mdash; separate referee model for scoring + final verdicts; Configure page dropdown &rarr; DONE
- [x] **[003] Per-participant temperature** &mdash; independent temperature sliders per model in Configure; stored in DB &rarr; `tasks/003-per-participant-temperature.md` &#10003; DONE
- [x] **[004] Backboard.io memory spike** &mdash; DIY SQLite memory system implemented; spike results doc written &rarr; `tasks/004-backboard-memory-spike-results.md` &#10003; DONE
- [x] **[005] Conversation CSV export** &mdash; Download CSV button in Analytics &rarr; DONE (no separate task file; implemented inline)

## 4. Architecture
```
Babel/
  server/
    app.py                     FastAPI app &mdash; mounts relay, experiments, presets, tournaments routers
    config.py                  Settings, model registry (7 models across 5 providers)
    presets.py                 YAML preset loader (resilient, logs malformed files)
    relay_engine.py            Core relay loop &mdash; call_model, build_messages, vocab extraction, RelayEvent constants
    rpg_engine.py              RPG mode &mdash; human-yielding loop, DM+player+AI party
    tournament_engine.py       Round-robin tournament runner &mdash; sequential matches, SSE events
    vocab_extractor.py         Regex-based invented word detection
    db.py                      SQLite schema + queries (experiments, turns, vocabulary, tournaments, model_memory)
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
      relay.py                 POST /start (+ preset resolution + model validation), GET /stream (SSE), GET /models/status, POST /pause, POST /resume, POST /inject
      experiments.py           GET list/detail/vocabulary/stats/turns/radar
      presets.py               GET list/detail
      tournaments.py           POST /start, GET list/detail/leaderboard/stream
  ui/
    src/
      pages/
        SeedLab.tsx            Landing page &mdash; preset card grid + tag filter + custom card
        Configure.tsx          Experiment config &mdash; agents array (2-4), per-agent temp, estimate bar, memory toggle, observer settings, launch
        Theater.tsx            Live-view + DB fallback &mdash; N-column layout, N-way sprites, verdict, pause/resume/inject, observer, Tree link
        BranchTree.tsx         D3 horizontal tree &mdash; experiment lineage, fork buttons, status colors, preset glow (NEW)
        Dictionary.tsx         WordCard grid + D3 constellation, stats bar, search/filter/sort, swimlane timeline
        Gallery.tsx            Past experiments log rows; mini sprites + preset stripe
        Analytics.tsx          Per-experiment stats, D3 charts, JSON/markdown/CSV export; View Tree button
        Arena.tsx              Tournament setup &mdash; model multi-select, launcher
        Tournament.tsx         Live match grid, leaderboard, radar chart
        Tournaments.tsx        Tournament history list at /tournaments
        Settings.tsx           API key status + model registry + in-app key config
      components/
        theater/               SpriteAvatar (accentColor+instanceId), TypewriterText, ArenaStage (N-agent), TurnBubble, ConversationColumn (agentIndex+AGENT_COLORS), ThinkingIndicator, RoundDivider, VocabPanel, TheaterCanvas, RPGTheater, HumanInput
        dictionary/            WordCard, ConstellationGraph (incremental D3), VocabBurstChart (per-round coinage bars + burst detection)
        analytics/             VocabGrowthChart, LatencyChart, RadarChart, RoundScoreChart, TokenChart (D3)
        common/                Layout (nav+transitions+glitch+babel-glitch listener), StarField (canvas neural net),
                               ScrambleText, NoiseOverlay, HudBrackets, ErrorBoundary
        ui/                    9 Shadcn primitives
      api/
        types.ts               All REST + SSE types; AgentConfig, TreeNode added; VerdictEvent.winner widened to string
        client.ts              fetchJson + api object (19+ endpoints including getExperimentTree)
        sse.ts                 useSSE hook (EventSource, typed events)
        hooks.ts               useExperimentState (event sourcing, pause/resume/observer state)
      lib/
        presetColors.ts        PRESET_GLOW map + getPresetGlow() helper (shared by ArenaStage, Gallery, Configure)
        format.ts              formatDuration helper
        symbols.ts             SYMBOL_MAP (emoji &rarr; geometric Unicode)
        prefs.ts               localStorage preferences
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
- **Theater DB fallback:** EventHub history is in-memory; server restart wipes it. Theater.tsx fetches turns + scores + verdict for completed experiments. `effectiveTurns`, `effectiveScores`, `effectiveVerdict` prefer SSE, fall back to DB.
- **Verdict persistence:** `winner` + `verdict_reasoning` stored in experiments table. `save_verdict()` called in `final_verdict()` after hub publish. `dbVerdict` state in Theater.tsx reconstructed from `exp.winner` / `exp.verdict_reasoning`.
- **Theater sprites:** `SpriteAvatar` clipPath IDs are `face-clip-model-a` / `face-clip-model-b` (unique per color to avoid SVG collision). `talkingSpeaker` uses a timeout keyed on `lastTurn.turn_id`. `latestTurnId` is null for completed experiments (typewriter only fires live).
- **Judge / scoring:** `judge_model` stored in experiments table (DEFAULT: config.JUDGE_MODEL = gemini-2.5-flash). `enable_scoring` fires `score_turn()` after each turn (fire-and-forget). `enable_verdict` fires `final_verdict()` at end. Both are opt-in toggles in Configure. `turn_scores` table holds per-turn scores. Scoring fails gracefully &mdash; turns complete even if judge call errors.
- **Preset colors:** `ui/src/lib/presetColors.ts` is the single source of truth for `PRESET_GLOW` map and `getPresetGlow()`. ArenaStage.tsx no longer has its own copy. Gallery + Configure import from here. When adding a new preset YAML, add its color here too.
- **BABEL glitch event:** Theater dispatches `window.dispatchEvent(new CustomEvent('babel-glitch'))` on each live turn arrival. Layout.tsx listens for it and fires `runGlitch()` immediately (clears pending schedule first). This is a decoupled CustomEvent pattern &mdash; no prop drilling.
- **Model memory:** `model_memory` table keyed on `(model_a, model_b)` canonical sorted pair. `generate_memory_summary()` is deterministic (vocab-based, no LLM call). `enable_memory` toggle in Configure. Memory injected at experiment start; saved as background task after verdict/completion.
- **Pause/Resume:** `resume_event` is an asyncio.Event per relay (initially set, pause clears, resume sets). Checkpoints before A and B turns; on resume, history is refreshed from DB. No DB schema changes needed &mdash; pause is transient SSE-only state.
- **Human turn injection:** Saved to DB with `speaker="Human"`, round inferred. Republished as `relay.turn` SSE event. `build_messages()` treats unknown speakers as "user" role &mdash; no code changes needed.
- **RPG mode:** `mode='rpg'` on experiments table. `human_events` dict on app.state holds per-match asyncio.Event. RPG engine (`rpg_engine.py`) publishes `relay.awaiting_human` then `await human_event.wait()`; POST `/inject` calls `event.set()` to resume. `participants_json` stores party config. DM is Model A; Player is human; AI party members call `call_model()` with global-perspective messages. Cleanup removes both `_running_relays` and `human_events` entries.
- **Observer model:** Optional fire-and-forget background task. Fires every N turns (configurable 1-10). Rendered inline as centered cards in Theater, not as a 3rd column.
- **Serena regex DOTALL gotcha:** `.*` in Serena replace_content regex (DOTALL mode) matches newlines &mdash; can greedily consume the rest of the file. Use literal mode or specific anchor text instead of `.*` at line boundaries.
- **Experiment forking:** `parent_experiment_id` + `fork_at_round` stored in experiments table. Fork flow: Theater Fork button &rarr; `/configure/:presetId?fork=<id>` &rarr; Configure pre-fills models/temps/seed + shows banner + sends `initial_history` + `parent_experiment_id` in POST body. `initial_history` pre-populates `turns[]` before relay loop.
- **VocabBurstChart:** Client-side burst detection &mdash; mean + 1.5&sigma; of per-round word counts. Burst bars = amber, normal = cyan. Lives in `ui/src/components/dictionary/VocabBurstChart.tsx`. Pure SVG + ResizeObserver (no D3 enter/update/exit needed). Dictionary.tsx ViewMode = `'cards' | 'constellation' | 'timeline' | 'burst'`.
- **Cross-run provenance:** `origin_experiment_id` column on vocabulary table. `tag_word_origins(experiment_id, parent_experiment_id)` bulk-UPDATE sets it for words in child that also exist in parent (case-insensitive LOWER() match). Fired via `asyncio.create_task()` at end of `run_relay()` only when `parent_experiment_id` is set. WordCard.tsx shows `[INHERITED]` badge linking to `/analytics/:origin_experiment_id`.
- **N-way agents:** `agents_config_json` TEXT column stores JSON array of `{model, temperature, name}`. `get_agents_for_experiment(row)` parses it; falls back to model_a/model_b for old experiments. Relay engine iterates agents in order each round. Non-self turns prefixed `[AgentName]: ` as "user" role. Speaker field in SSE events: `agent_0`, `agent_1`, etc. Old DB records still have `model_a`/`model_b` as speaker &mdash; `resolveWinnerIndex()` handles both. Tournament mode still uses 2-agent path.
- **AGENT_COLORS palette:** `['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6']` (amber/cyan/emerald/violet). Exported from `ConversationColumn.tsx`. Used by ArenaStage, Theater, Configure. Index 0=A, 1=B, 2=C, 3=D.
- **Dynamic grid (N columns):** Never use `grid-cols-${n}` &mdash; Tailwind purges dynamic class names. Use `style={{ gridTemplateColumns: 'repeat(N, 1fr)' }}` inline style instead.
- **SpriteAvatar instanceId:** With N sprites on the same page, SVG clipPath IDs must be unique globally. Pass `instanceId={String(idx)}` to prevent `face-clip-model-a` collision across multiple SVGs.
- **BranchTree D3 layout:** `d3.tree<TreeNode>().nodeSize([V_GAP, H_GAP])(root)` returns `HierarchyPointNode`. Horizontal orientation: svg_x = `d.y + offsetX`, svg_y = `d.x + offsetY`. Bezier edge: source right edge `(d.y + ox + NODE_W, d.x + oy)` &rarr; target left edge `(d.y + ox, d.x + oy)` with midpoint control. Rendered in `useEffect([treeData, navigate])`; SVG ref becomes available after loading state clears.
