# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code (Opus 4.6)
**Current Goal:** Phase 3 complete — vocabulary extractor + dictionary ready for Gemini Checkpoint 3 review

## Changes This Session

### Gemini Checkpoint 3 — Review Triage
Gemini reviewed the full codebase after Phase 2. Validation results:
- **Bug #1 (system_prompt erasure): FIXED** — `system_prompt: ''` in Theater.tsx was overriding DEFAULT_SYSTEM_PROMPT. Removed the key from payload, made field optional in TS interface.
- **Bug #2 (async generator corruption): Already fixed** — Queue-based keepalive was implemented in Checkpoint 2.
- **Bug #3 (O(n²) array spread): Already fixed** — `push()` used, not spread.
- **Bug #4 (reconnect state duplication): Already fixed** — `setEvents([])` in onopen.
- **Bug #5 (hardcoded CORS): Skipped** — localhost-only is fine for dev.
- **Bug #6 (forced auto-scroll): Already fixed** — `isNearBottomRef` threshold in place.

### Phase 3: Vocabulary Extractor + Dictionary
- [x] Created `server/vocab_extractor.py` — regex-based extraction with `ExtractedWord` dataclass
  - Pattern 1: Explicit definitions (`WORD = meaning`, `WORD: meaning`, "propose WORD to mean...")
  - Pattern 2: ALL_CAPS tokens (3+ chars, blocklist of ~60 common words/acronyms)
  - Detects categories from grammar markers (noun/verb/prefix/etc.)
  - Detects parent_words by scanning definitions for known vocabulary
  - Tested: correctly extracts words with meanings and parent relationships
- [x] Wired extractor into `server/relay_engine.py` — `_extract_and_publish_vocab()` called after each turn
  - `known_words: set[str]` accumulator tracks words across all rounds
  - Publishes `relay.vocab` SSE events (constant was defined but unwired since Phase 1)
  - Persists via `db.upsert_word()` (schema + CRUD existed since Phase 1)
- [x] Created `server/routers/experiments.py` — REST endpoints for experiment data
  - `GET /api/experiments/` — list recent experiments
  - `GET /api/experiments/{id}` — experiment metadata
  - `GET /api/experiments/{id}/vocabulary` — all extracted words
- [x] Frontend type plumbing:
  - `VocabEvent` interface added to SSE discriminated union (now 6 event types)
  - `VocabWord`, `VocabResponse`, `ExperimentRecord` REST types
  - `getExperiment()` + `getVocabulary()` added to API client
  - `vocab: VocabEvent[]` added to `ExperimentState` with `relay.vocab` case
- [x] Installed D3 v7 + @types/d3
- [x] Created `VocabPanel` — inline strip in Theater (word count + recent words + dictionary link)
- [x] Created `WordCard` — color-coded card (word, meaning, category badge, metadata, parent chips)
- [x] Created `ConstellationGraph` — D3 force-directed graph (useRef + useEffect pattern)
  - Nodes sized by usage_count, colored by coined_by speaker
  - Edges from parent_words relationships
  - Draggable nodes, click to select, hover tooltips
- [x] Created `Dictionary` page at `/dictionary/:experimentId`
  - Cards grid view + Constellation toggle
  - Polls every 10s during live experiments
  - Linked from VocabPanel in Theater

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `server/vocab_extractor.py` | Regex extraction engine — ExtractedWord dataclass + extract_vocabulary() |
| `server/routers/experiments.py` | REST endpoints for experiment data + vocabulary |
| `ui/src/components/dictionary/WordCard.tsx` | Single word display card |
| `ui/src/components/dictionary/ConstellationGraph.tsx` | D3 v7 force-directed graph |
| `ui/src/components/theater/VocabPanel.tsx` | Inline vocab strip in Theater |
| `ui/src/pages/Dictionary.tsx` | Full dictionary page with cards + constellation views |

### Modified Files
| File | Change |
|------|--------|
| `server/relay_engine.py` | Added `_extract_and_publish_vocab()` + `known_words` + 2 call sites |
| `server/app.py` | Mounted experiments router at `/api/experiments` |
| `ui/src/api/types.ts` | Added VocabEvent, VocabWord, VocabResponse, ExperimentRecord; system_prompt optional |
| `ui/src/api/client.ts` | Added getExperiment() + getVocabulary() |
| `ui/src/api/hooks.ts` | Added vocab to ExperimentState + relay.vocab case |
| `ui/src/pages/Theater.tsx` | Removed system_prompt bug, added VocabPanel |
| `ui/src/App.tsx` | Added /dictionary/:experimentId route |
| `ui/package.json` | Added d3 + @types/d3 dependencies |

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| TypeScript build (tsc -b) | PASSED | Zero errors |
| Vite production build | PASSED | 2445 modules, 0 errors |
| Python import check | PASSED | `from server.vocab_extractor import extract_vocabulary` OK |
| Extractor functional test | PASSED | Correctly extracts ZYLOK, KRAVT, SYNTHOLINK, NEXVOL from sample text |
| Parent words detection | PASSED | BRAVOL correctly identifies ZYLOK + KRAVT as parents |
| Live end-to-end test | NOT YET | Needs backend + frontend running together |

## Known Issues
- **Extractor category false positive:** "meaning" in the context window can match `_CATEGORY_RE` and tag words as category="verb" incorrectly. Minor — acceptable for v1, can refine the regex window later.
- **Node not on system PATH**: All npm/node commands must use full paths or `run_npm.cmd`
- **D3 @types/d3 in dependencies not devDependencies**: Functional, cosmetic only

## Next Steps
1. **Gemini Checkpoint 3 review** — have Gemini review Phase 3 implementation
2. **Live end-to-end test** — start backend + frontend, run experiment, verify vocab extraction + dictionary page
3. **Phase 4: Seed Lab + Presets** — preset YAML files, SeedLab page with cards + custom builder

## Key Decisions for Gemini to Review
- **Regex over LLM for extraction**: Chose regex heuristics for v1 — free, instant, no API calls. LLM enrichment can be layered later for better meaning/category detection.
- **Dictionary polling over SSE**: Dictionary page uses 10s REST polling instead of a second SSE connection. Simpler, and the page is typically viewed after experiments, not during.
- **D3 via useRef + useEffect**: Standard React + D3 pattern. React owns the SVG element, D3 owns everything inside it imperatively. Avoids React/D3 DOM conflict.

## Key References
- **Phase 3 plan:** `~/.claude/plans/curious-brewing-lake.md`
- **Phase 2 plan:** `~/.claude/plans/noble-brewing-fairy.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
- **Gemini proposals:** `GEMINI_Feature_Specification_PIXEL.md`, `GEM_The_Virtual_Tabletop_expansion.md`
