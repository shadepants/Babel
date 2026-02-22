# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** —
**Current Goal:** Phase 3 complete + Gemini Checkpoint 3 applied — ready for Phase 4

## What's Done (Cumulative)
- **Phase 1:** Backend core — FastAPI, relay engine, EventHub SSE, SQLite WAL, config/registry
- **Phase 2:** React UI — Theater page, SSE streaming, start form, Shadcn components
- **Phase 3:** Vocabulary extractor + dictionary — regex extraction, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation graph
- **Gemini Checkpoints 1-3:** All review findings addressed (13 fixes total across 3 reviews)

## Session Summary (Phase 3)

### Built
- `server/vocab_extractor.py` — regex extraction: definitions, ALL_CAPS tokens, categories, parent word relationships
- `server/routers/experiments.py` — REST: `GET /api/experiments/`, `GET /{id}`, `GET /{id}/vocabulary`
- `server/relay_engine.py` — `_extract_and_publish_vocab()` wired after each turn, `relay.vocab` SSE events now live
- `ui/src/pages/Dictionary.tsx` — cards grid + D3 constellation toggle, polls during live experiments
- `ui/src/components/dictionary/WordCard.tsx` — color-coded word card
- `ui/src/components/dictionary/ConstellationGraph.tsx` — D3 v7 force graph (usage-sized nodes, parent edges, draggable)
- `ui/src/components/theater/VocabPanel.tsx` — inline Theater strip (word count + badges + dictionary link)

### Fixed (Gemini reviews)
- Removed `system_prompt: ''` overriding server default (Checkpoint 3, finding #1)
- Hardened litellm `response.usage` parsing — handles dict or object (Checkpoint 3, finding #1)
- Corrected `turn_id` type cast from string to number in sse.ts (Checkpoint 3, finding #4)

## Verification Status
| Check | Status |
|-------|--------|
| TypeScript build (tsc -b) | PASSED |
| Vite production build | PASSED (2445 modules, 0 errors) |
| Python import check | PASSED |
| Extractor functional test | PASSED (4 words extracted correctly) |
| Parent words detection | PASSED (BRAVOL → [ZYLOK, KRAVT]) |
| Live end-to-end test | NOT YET |

## Known Issues
- **Extractor category false positive:** "meaning" in context window can false-match as category="verb". Minor, acceptable for v1.
- **Node not on system PATH:** Use full paths or `run_npm.cmd` for npm/node commands.
- **SSE history buffer:** Capped at 500 events in-memory. Fine for 5-7 round experiments. DB replay fallback is a Phase 5 optimization.
- **CORS localhost-only:** Intentional for dev. Move to env-based origins when deploying.

## Next Steps
1. **Live end-to-end test** — start backend + frontend, run a real experiment, verify vocab extraction works in browser
2. **Phase 4: Seed Lab + Presets**
   - Preset YAML files (conlang, debate, story, cipher, emotion-math, philosophy)
   - SeedLab page with preset cards + custom builder
   - `server/routers/presets.py` — `GET /api/presets`
   - Route: `/seedlab`

## Git State
- **Branch:** master
- **Latest commits:**
  - `65a16bb` fix: harden litellm usage parsing and correct turn_id type (Gemini review)
  - `b2f4407` feat: Phase 3 vocabulary extractor + dictionary
- **Remote:** up to date with `origin/master`
- **Untracked (pre-existing):** `ui/.gitignore`, `ui/README.md`

## Key References
- **Phase 3 plan:** `~/.claude/plans/curious-brewing-lake.md`
- **Phase 2 plan:** `~/.claude/plans/noble-brewing-fairy.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
- **Gemini proposals:** `GEMINI_Feature_Specification_PIXEL.md`, `GEM_The_Virtual_Tabletop_expansion.md`
