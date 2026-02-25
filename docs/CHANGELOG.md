# Babel Changelog — Completed Phases

## Phase 1: Project Scaffold + Backend Core
- Python venv + FastAPI skeleton, relay engine, EventHub SSE, SQLite schema, config/model registry
- Gemini Checkpoint 1 — 4 fixes (keepalive bug, token tracking, null guard, atomic upsert)

## Phase 2: React UI Shell + Theater View
- React 19 + Vite 7 + Tailwind 3.4 + Shadcn/UI scaffold
- Conversation Theater — split columns, turn bubbles, thinking states, SSE streaming
- Gemini Checkpoint 2 — 5 fixes (queue keepalive, O(n2) render, reconnect dedup, auto-scroll, a11y)

## Phase 3: Vocabulary Extractor + Dictionary
- Regex vocab extractor, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation
- Gemini Checkpoint 3 — removed `system_prompt: ''` override

## Phase 4: Seed Lab + Presets
- 6 preset YAMLs, SeedLab landing page, Configure page, Theater simplified to pure live-view, nav bar
- Audit fixes: route ordering, resilient preset loader, dynamic Tailwind class fix

## Phase 5: Gallery + Analytics
- Gallery at `/gallery` — card grid, status badges, quick-nav to Theater/Dictionary
- Analytics at `/analytics/:experimentId` — stats row, D3 vocab growth + latency charts, JSON/markdown export
- Gemini Checkpoint 4 — 4 fixes (incremental D3 graph, EventHub buffer 200-2000, async vocab extraction, self-ref parent word filter)

## Phase 6: Arena Mode + Polish
- Tournament engine — round-robin runner, sequential match execution, SSE lifecycle events
- Tournament DB — `tournaments` + `tournament_matches` tables, leaderboard aggregation, per-model radar stats
- Arena page at `/arena` — model multi-select (min 3, max 10), preset dropdown, live pairing count
- Tournament page at `/tournament/:id` — live match grid, progress bar, leaderboard table, radar chart overlay
- Settings page at `/settings` — live API key status indicators + model registry table
- "The Original" preset — recreate viral Reddit Claude vs Gemini experiment (15 rounds)
- README, audit hardening, bug fixes. Build passes: 2456 modules, 0 errors

## Phase 7: Sci-Fi Observatory UI/UX
- Design system — Orbitron (display), Inter (UI), JetBrains Mono (conversation) fonts; amber/cyan model colors; CSS glow tokens
- StarField — tsParticles ambient star field (later replaced by pure canvas in Phase 9)
- Theater reactive canvas — pulse rings + 12-dot vocab bursts per turn
- SeedLab animations — Framer Motion staggered card entrances

## Phase 8: Full Neural Design System
- Global typography — all h1/h2 to Orbitron uppercase; `.neural-section-label` monospace headers
- NoiseOverlay, HudBrackets, BABEL shimmer, neural card/btn/provider/row classes
- All pages restyled: Gallery, Arena, Configure, Settings, SeedLab, Layout

## Phase 9: Living Neural Network
- StarField rewrite — pure canvas (replaces tsParticles); 3 depth layers with mouse parallax; cascade pulses; route-aware RGB tint
- ScrambleText — ASCII glyph scramble on mount, left-to-right reveal, 2000ms duration
- Page transitions — AnimatePresence blur-fade, keyed by pathname
- BABEL glitch — 4-frame chromatic aberration every 9-22s
- Synaptic bloom, activity trails, gamma burst events
- Encoding fix — rewrote all 5 pages to fix PowerShell UTF-8 double-encoding artifacts

## Gemini Audit Hardening
- `asyncio.Lock` write lock in db.py; `_log_task_exception()` on all `create_task()` calls
- EventHub monotonic `event_id` counter; `subscribe()` accepts `last_event_id` for selective replay
- SSE emits `id: N\n`; reads `Last-Event-ID` on reconnect

## Tasks 001-005
- **001** Round-by-round scoring — per-turn evaluation via judge model
- **002** Configurable judge model — separate referee for scoring + verdicts
- **003** Per-participant temperature — independent temp sliders per model
- **004** DIY Model Memory — SQLite pair-keyed memory (backboard.io spike rejected)
- **005** CSV Export — Download CSV button in Analytics

## Phase 10: 8-bit Theater Revamp
- SpriteAvatar — pure SVG pixel-art avatar; 6 states (idle/thinking/talking/error/winner/loser)
- TypewriterText — char-by-char reveal on latest live turn
- ArenaStage — HUD bracket frame, sprites + VS divider, preset-tinted gradient
- TurnBubble rewrite — left-stripe terminal styling, scanline texture
- Bug fix: Theater empty on revisit — DB fallback for completed experiments

## Session 5: Verdict Persistence + Theater Cohesion
- `winner` + `verdict_reasoning` columns; `save_verdict()` in db.py
- Shared `presetColors.ts` extracted; Gallery + Analytics mini sprites
- BABEL glitch event — Theater dispatches on turn arrival, Layout listens

## Phase 11: Quick Wins + Polish
- Experiment nickname, inline editor, tab title live state, hover timestamps
- Vocab inline linking, model A/B swap button, remix button, effectiveVocab pattern

## Phase 12: Dictionary Revamp
- Stats row, search/filter/sort (Shadcn Combobox), constellation upgrades (D3 force-directed)
- Swimlane timeline — horizontal bar chart by round

## Phase 13: Interactive Experiments
- Pause/Resume — `resume_event` asyncio.Event per relay
- Human Turn Injection — POST `/inject` endpoint
- Observer/Narrator Model — optional third model, configurable interval
- New SSE events: PAUSED, RESUMED, OBSERVER

## Phase 13b: Virtual Tabletop RPG Mode
- RPG Engine — human-yielding loop; DM (AI) narrates, Player (human) types
- DB migrations — `mode`, `participants_json` columns
- RPGTheater, HumanInput components; emerald color scheme

## Phase 14: Cross-Experiment Intelligence
- VocabBurstChart — per-round coinage bars with burst detection (mean + 1.5 sigma)
- Experiment Forking — `parent_experiment_id`, `fork_at_round`, initial_history
- Cross-Run Provenance — `origin_experiment_id` on vocabulary, `[INHERITED]` badge

## Phase 15: New Conversation Structures
- N-way relay (3-4 agents) — `agents_config_json`, N-column Theater, AGENT_COLORS palette
- BranchTree — D3 horizontal tree at `/tree/:experimentId`

## Phase 16: Depth + Legacy
- Persistent personas — CRUD router, personality/backstory/avatar_color, per-agent assignment
- AI Documentary — cache-first generation, mode-aware prompts (science journalist / fantasy chronicler)
- RPG Campaign Persistence — reuses model_memory table with `rpg:{preset}` key overloading
