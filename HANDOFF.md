# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Phase 6 complete — project shipped

## What's Done (Cumulative)
- **Phase 1:** Backend core — FastAPI, relay engine, EventHub SSE, SQLite WAL, config/registry
- **Phase 2:** React UI — Theater page, SSE streaming, Shadcn components
- **Phase 3:** Vocabulary extractor + dictionary — regex extraction, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation
- **Phase 4:** Seed Lab + Presets — 6 preset YAMLs, SeedLab landing page, Configure page, Theater simplified to pure live-view, nav bar
- **Phase 5:** Gallery + Analytics — experiment gallery, per-experiment analytics with D3 charts, JSON/markdown export
- **Gemini Checkpoints 1-4:** 17 total fixes across all phases
- **Phase 6:** Arena + Tournament mode, RadarChart, Settings page, "The Original" preset, README, audit hardening, two UI bug fixes

## Session Summary (Phase 6 + Audit + Bug Fixes)

### Phase 6 Features
- **Tournament engine** (`server/tournament_engine.py`) — round-robin runner using `itertools.combinations`, sequential `run_relay()` calls, SSE lifecycle events (`tournament.match_started`, `tournament.match_complete`, `tournament.complete`, `tournament.error`)
- **Tournament DB** — `tournaments` + `tournament_matches` tables; `get_tournament_leaderboard()` aggregates per-model stats; `get_model_radar_stats()` returns 5-axis radar data
- **Arena page** — model multi-select checkbox grid (min 3), live pairing count ("4 models → 6 matches"), preset dropdown, sliders
- **Tournament page** — SSE live updates + 10s polling, match card grid with status badges + Theater/Analytics links, leaderboard table, RadarChart overlay
- **RadarChart** — D3 spider chart with concentric rings, filled polygons per model (30% fill), 5 axes: verbosity/speed/creativity/consistency/engagement
- **Settings page** — checks env vars for 7 models across 5 providers, shows green/red status indicators
- **"The Original" preset** — exact seed words (ZYLVOK/KRAXT/FLUMEI), system prompt framing the "human relay" setup, 15 rounds default

### Audit Hardening (3-reviewer parallel audit)
- **DB normalization:** Fixed zero-collapse bug (all-identical values → `1.0` not `0.0`) and consistency metric inversion (single sample = no variance = `1.0/0.01` not `0`)
- **Tournament router:** asyncio task storage (`_active_tasks` set), `models` bounds (min 3 / max 10), `limit/offset` Query bounds, SSE self-close on terminal events
- **Relay + experiments routers:** model allowlist validation, status filter validation, query bounds
- **Error sanitization:** relay_engine and tournament_engine send generic messages to clients; raw exception strings go to server logs only

### Bug Fixes (found while reviewing live experiments)
- **LatencyChart CSS selector crash** — model names with dots (e.g. `llama-3.3-70b-versatile`) produced invalid CSS selectors in D3's `selectAll()`. Fixed: `label.replace(/[^a-zA-Z0-9_-]/g, '_')`
- **Copy Markdown silent failure** — `navigator.clipboard.writeText()` fails when document lacks focus; silent `catch {}` gave no feedback. Fixed: `execCommand('copy')` fallback via hidden textarea + `Copied!`/`Failed` button state

## Verification Status
| Check | Status |
|-------|--------|
| Python import check | PASSED — all 5 backend modules |
| Vite production build | PASSED — 2456 modules, 0 errors |
| Analytics page (gpt-4o-mini vs llama) | PASSED — charts render, no crash |
| Copy Markdown clipboard | PASSED — execCommand fallback works |
| Context leak audit | CLEAN — no unintended cross-model state |
| Commits pushed | PASSED — `1ee18c0`, `a81f777` on master |

## Known Issues / Next Steps
- **Side-by-side comparison view** (Phase 6b) — deferred; compare two experiments head-to-head
- **pytest not in venv** — `pip install pytest` needed before running backend tests
- **Tournament E2E not tested live** — requires API keys + real LLM calls; backend logic verified via code review
- **Pre-existing TS type warnings** — `turn_id` string/number mismatch in `sse.ts`, unused `modelB` in `WordCard.tsx` — don't block build

## Git State
- **Branch:** master
- **Latest commits:**
  - `a81f777` — `fix: LatencyChart CSS selector crash + copy markdown clipboard fallback`
  - `1ee18c0` — `feat: Phase 6 Arena + Tournament mode + audit hardening`
  - `9820eb5` — `feat: Phase 5 Gallery + Analytics + Gemini Checkpoint 4 fixes`

## Key References
- **Phase 6 plan:** `~/.claude/plans/swift-discovering-beaver.md`
- **Phase 5 plan:** `~/.claude/plans/idempotent-napping-fiddle.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
