# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** —
**Current Goal:** Phase 4 complete — ready for Phase 5

## What's Done (Cumulative)
- **Phase 1:** Backend core — FastAPI, relay engine, EventHub SSE, SQLite WAL, config/registry
- **Phase 2:** React UI — Theater page, SSE streaming, start form, Shadcn components
- **Phase 3:** Vocabulary extractor + dictionary — regex extraction, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation graph
- **Phase 4:** Seed Lab + Presets — 6 preset YAML files, SeedLab landing page, Configure page, Settings placeholder, Theater simplified to pure live-view, nav bar
- **Gemini Checkpoints 1-3:** All review findings addressed (13 fixes total across 3 reviews)
- **Post-Phase 4 audit:** Route ordering fix, unused imports cleanup, resilient preset loader, Tailwind dynamic class fix, Dictionary link text fix

## Session Summary (Phase 4)

### Built
- `server/presets/*.yaml` (×6) — conlang, debate, story, cipher, emotion-math, philosophy
- `server/presets.py` — YAML loader with error handling (malformed files skip gracefully)
- `server/routers/presets.py` — `GET /api/presets` (list) + `GET /api/presets/{id}` (single)
- `server/app.py` — lifespan loads presets to `app.state`, mounts presets router
- `server/routers/relay.py` — preset resolution: when `preset` is set, server overrides seed + system_prompt from YAML (authoritative source of truth)
- `ui/src/pages/SeedLab.tsx` — landing page at `/`, preset card grid with emoji/tags/description + Custom card
- `ui/src/pages/Configure.tsx` — full experiment config at `/configure/:presetId` (models, rounds, temperature, max tokens, seed editing, system prompt)
- `ui/src/pages/Settings.tsx` — placeholder stub at `/settings`
- `ui/src/pages/Theater.tsx` — simplified to pure live-view at `/theater/:matchId`, setup form removed entirely
- `ui/src/components/common/Layout.tsx` — nav bar: BABEL brand + Seed Lab + Settings links
- `ui/src/App.tsx` — new route structure: `/` → SeedLab, `/configure/:presetId` → Configure, `/theater/:matchId` → Theater

### Fixed (audit)
- `server/routers/experiments.py` — route ordering bug: `GET /` moved before `GET /{experiment_id}` (list endpoint was unreachable)
- `server/routers/relay.py` — removed unused imports (`json`, `typing.Any`)
- `server/presets.py` — added try/except + logging for malformed YAML files
- `ui/src/components/dictionary/WordCard.tsx` — replaced dynamic Tailwind class `text-${color}` with explicit conditional (prevents production CSS purge)
- `ui/src/pages/Dictionary.tsx` — fixed "Back to Theater" link text → "Back to Seed Lab" (matches `/` destination)

## Verification Status
| Check | Status |
|-------|--------|
| Python import check | PASSED (6 presets loaded) |
| Vite production build | PASSED (2449 modules, 0 errors) |
| Route ordering fix | APPLIED |
| Live end-to-end test | NOT YET |

## Known Issues
- **`setup.ps1` / `start.ps1` missing:** Referenced in old CONTEXT.md but never created. Removed from docs. Manual launch commands documented instead.
- **Pre-existing TS type warnings:** `turn_id` string/number mismatch in `sse.ts`, D3 drag type in `ConstellationGraph.tsx` — these are from Phase 3 and don't block the Vite build.
- **Preset `defaults` not applied server-side:** When a preset is resolved, only `seed` and `system_prompt` are overridden. The client sends its own `rounds`, `temperature`, `max_tokens`. The Configure page pre-fills from preset defaults, so in practice the values match.
- **SeedLab cards not keyboard accessible:** Cards use `onClick` on `<div>` — missing `tabIndex`, `role="button"`, `onKeyDown`. Low-priority a11y fix.

## Next Steps
1. **Live end-to-end test** — start backend + frontend, run a real experiment from SeedLab → Configure → Theater flow
2. **Phase 5: Gallery + Analytics**
   - Experiment gallery (past runs, card grid)
   - Analytics dashboard (growth curves, adoption rate, latency)
   - Export features (markdown blog post, JSON download)

## Git State
- **Branch:** master
- **Latest commits:** (pending — Phase 4 work needs to be committed)
- **Files changed:** 9 modified, 10 new files

## Key References
- **Phase 4 plan:** `~/.claude/plans/swirling-splashing-dahl.md`
- **Phase 3 plan:** `~/.claude/plans/curious-brewing-lake.md`
- **Phase 2 plan:** `~/.claude/plans/noble-brewing-fairy.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
- **Gemini proposals:** `GEMINI_Feature_Specification_PIXEL.md`, `GEM_The_Virtual_Tabletop_expansion.md`
