# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Phase 5 complete — ready for live E2E test then Phase 6

## What's Done (Cumulative)
- **Phase 1:** Backend core — FastAPI, relay engine, EventHub SSE, SQLite WAL, config/registry
- **Phase 2:** React UI — Theater page, SSE streaming, start form, Shadcn components
- **Phase 3:** Vocabulary extractor + dictionary — regex extraction, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation graph
- **Phase 4:** Seed Lab + Presets — 6 preset YAML files, SeedLab landing page, Configure page, Settings placeholder, Theater simplified to pure live-view, nav bar
- **Phase 5:** Gallery + Analytics — experiment gallery card grid, per-experiment analytics with D3 charts (vocab growth + latency), JSON/markdown export, `/stats` and `/turns` endpoints
- **Gemini Checkpoints 1-4:** All review findings addressed (17 fixes total across 4 reviews)
- **Post-Phase 4 audit:** Route ordering fix, unused imports cleanup, resilient preset loader, Tailwind dynamic class fix, Dictionary link text fix
- **Tooling:** Enhanced `~/.claude/hooks/skill-suggester.py` with dynamic skill discovery

## Session Summary (Phase 5 Implementation)

### Gemini Checkpoint 4 Fixes (4 issues)
1. **Critical — D3 Graph Tearing:** Rewrote `ConstellationGraph.tsx` to use incremental D3 `.data().join()` pattern. Simulation persists via `useRef`, new words animate in smoothly with `alpha(0.3)` reheat instead of full graph destruction.
2. **Moderate — EventHub Buffer:** Bumped `max_history` and queue `maxsize` from 200→2000 in `event_hub.py`. Prevents late-joining clients from losing history and slow clients from being dropped.
3. **Minor — Sequential Vocab Extraction:** Changed `await _extract_and_publish_vocab()` to `asyncio.create_task()` in `relay_engine.py`. Agent B starts thinking immediately instead of waiting for vocab DB writes.
4. **Edge Case — Self-Referencing Parent Words:** Added `if p != word` filter in `vocab_extractor.py` to prevent circular edges in the D3 graph.

### Phase 5 Features
- **Backend:** `get_experiment_stats()` in `db.py` — pre-aggregated per-round latency/tokens, vocab growth curve, totals. `list_experiments()` extended with `offset`/`status` params. New `/stats` and `/turns` endpoints in `experiments.py`.
- **Gallery page** (`/gallery`): Card grid mirroring SeedLab pattern. Status badges (running=green pulse, completed=purple, failed=red). Model pair names, round progress, elapsed time, preset tag. Quick-nav buttons to Theater/Dictionary. Empty state links to Seed Lab.
- **Analytics page** (`/analytics/:experimentId`): Stats summary row (5 cards), D3 vocab growth line chart (purple accent), D3 latency comparison dual-line chart (indigo vs amber). Export buttons: "Download JSON" (blob download) and "Copy Markdown" (clipboard). Polls every 10s for running experiments.
- **D3 Charts:** `VocabGrowthChart.tsx` and `LatencyChart.tsx` in `components/analytics/`. Follow ConstellationGraph's `useRef + useEffect + d3.select` pattern. Dark theme colors, axis labels, tooltips.
- **Types + API:** 6 new TypeScript types, 3 new API client methods (`listExperiments`, `getExperimentStats`, `getExperimentTurns`). `ExperimentRecord` now includes `preset` field.
- **Routing:** Gallery and Analytics routes added to `App.tsx`. "Gallery" NavLink added to `Layout.tsx` nav bar.

## Verification Status
| Check | Status |
|-------|--------|
| Python import check | PASSED (all backend modules) |
| TypeScript check | PASSED (0 errors) |
| Vite production build | PASSED (2453 modules, 0 errors) |
| pytest | NOT INSTALLED in venv |
| Live end-to-end test | NOT YET |

## Known Issues
- **`setup.ps1` / `start.ps1` missing:** Manual launch commands documented in CONTEXT.md instead.
- **Pre-existing TS type warning:** `turn_id` string/number mismatch in `sse.ts` — from Phase 3, doesn't block build.
- **Preset `defaults` not applied server-side:** Client sends its own values; Configure page pre-fills from preset defaults so they match in practice.
- **SeedLab/Gallery cards not keyboard accessible:** Cards use `onClick` on `<div>` — missing `tabIndex`, `role="button"`, `onKeyDown`. Low-priority a11y fix.
- **pytest not in venv:** `pip install pytest` needed before running backend tests.

## Next Steps
1. **Live end-to-end test** — start backend + frontend, run a real experiment from SeedLab → Configure → Theater → Gallery → Analytics flow
2. **Phase 6: Arena Mode + Polish**
   - Multi-model tournament runner
   - Side-by-side comparison view
   - Model personality radar chart
   - README with screenshots, GitHub publish

## Git State
- **Branch:** master
- **Latest commit:** (pending — Phase 5 commit about to be created)

## Key References
- **Phase 5 plan:** `~/.claude/plans/idempotent-napping-fiddle.md`
- **Phase 4 plan:** `~/.claude/plans/swirling-splashing-dahl.md`
- **Phase 3 plan:** `~/.claude/plans/curious-brewing-lake.md`
- **Phase 2 plan:** `~/.claude/plans/noble-brewing-fairy.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
- **Gemini proposals:** `GEMINI_Feature_Specification_PIXEL.md`, `GEM_The_Virtual_Tabletop_expansion.md`
