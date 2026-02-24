# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-24 (Session 13)
**Active Agent:** Claude Code
**Current Goal:** Phase 16 (Depth & Legacy) -- complete and verified

## What Was Done This Session

### Session 13: Phase 16 Implementation (from context-compacted state)

All 15 Phase 16 files implemented and verified. Three features shipped:

#### Feature 1: Persistent Personas
- [x] `server/db.py` -- `personas` table in schema; 5 CRUD methods; idempotent
- [x] `server/routers/personas.py` (NEW) -- full REST CRUD at /api/personas
- [x] `server/app.py` -- mounted personas router
- [x] `server/relay_engine.py` -- `PersonaRecord` dataclass; `persona` field on RelayAgent; system-prompt injection in agent loop
- [x] `server/rpg_engine.py` -- per-actor persona injection from participant_persona_ids map
- [x] `server/routers/relay.py` -- `persona_ids` field in RelayStartRequest; persona lookup after agents built
- [x] `ui/src/api/types.ts` -- `PersonaRecord` interface; `persona_ids?` on RelayStartRequest
- [x] `ui/src/api/client.ts` -- `getPersonas()`, `createPersona()`, `updatePersona()`, `deletePersona()`
- [x] `ui/src/pages/Settings.tsx` -- Personas management panel (list, create/edit form, 4-color picker)
- [x] `ui/src/pages/Configure.tsx` -- per-agent persona dropdown; persona_ids sent on launch

#### Feature 2: AI Documentary
- [x] `server/db.py` -- `documentary TEXT` column migration (idempotent); `save_documentary()` + `get_documentary()`
- [x] `server/routers/experiments.py` -- `POST /{id}/documentary` endpoint (cache-first; mode-aware LLM prompt; asyncio.to_thread)
- [x] `ui/src/api/types.ts` -- `documentary?` field on ExperimentRecord
- [x] `ui/src/api/client.ts` -- `generateDocumentary(experimentId)`
- [x] `ui/src/pages/Documentary.tsx` (NEW) -- /documentary/:id page; sci-fi terminal layout; ScrambleText headers; vocab links
- [x] `ui/src/App.tsx` -- route + violet tint
- [x] `ui/src/pages/Analytics.tsx` -- "View Documentary" button
- [x] `ui/src/components/theater/RPGTheater.tsx` -- "Generate Recap" button when complete

#### Feature 3: RPG Campaign Persistence
- [x] `server/db.py` -- `generate_rpg_memory_summary()` (deterministic, no LLM, <=500 chars)
- [x] `server/rpg_engine.py` -- loads past memories into DM system prompt at start; fires `_save_rpg_memory()` task at end; `preset` + `participant_persona_ids` params added
- [x] `server/routers/relay.py` -- passes preset + persona_ids to rpg_engine

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript tsc --noEmit | PASSED | Zero errors, no output |
| Python ast.parse | PASSED | All 7 backend files: db.py, relay_engine.py, rpg_engine.py, routers/relay.py, routers/experiments.py, routers/personas.py, app.py |
| personas.py UTF-8 NoBOM | FIXED | PowerShell Set-Content writes BOM; used [System.Text.UTF8Encoding]::new($false) |
| Runtime smoke test | PENDING | Not yet run (dev server not started this session) |

## Errors Encountered & Fixed

1. **Serena no active project** -- activated Babel project before any replace_content calls
2. **db.py ambiguous pattern** -- `for e in entries:` appeared twice; used surrounding comment block as unique anchor
3. **personas.py BOM** -- PowerShell UTF-8 BOM caused Python SyntaxError; fixed via `[System.Text.UTF8Encoding]::new($false)` + `[System.IO.File]::WriteAllText()`

## Next Steps (Priority Order)

1. [ ] **Commit Phase 16** -- stage these files: server/db.py, server/relay_engine.py, server/rpg_engine.py, server/routers/relay.py, server/routers/experiments.py, server/routers/personas.py, server/app.py, ui/src/api/types.ts, ui/src/api/client.ts, ui/src/pages/Settings.tsx, ui/src/pages/Configure.tsx, ui/src/pages/Documentary.tsx, ui/src/App.tsx, ui/src/pages/Analytics.tsx, ui/src/components/theater/RPGTheater.tsx
2. [ ] **Persona smoke test** -- Settings: create persona "Zephyr" (personality: cryptic oracle) -> Configure: assign to Agent A -> launch 3-round experiment -> verify output style reflects persona
3. [ ] **Documentary smoke test (standard)** -- Analytics: click "View Documentary" -> /documentary/:id -> first load triggers POST generation -> refresh -> served from cache
4. [ ] **Documentary smoke test (RPG)** -- complete short RPG session -> RPGTheater "Generate Recap" button -> /documentary/:id shows fantasy-chronicler narrative
5. [ ] **Campaign persistence test** -- run RPG session #1 (preset=conlang, DM=modelX) -> run session #2 same config -> verify server log shows "CAMPAIGN HISTORY:" in DM system prompt
6. [ ] **Runtime 3-agent relay** -- Configure 3-agent -> launch -> Theater 3-column layout (deferred from Phase 15)
7. [ ] **Phase 17 planning** -- decide next theme (conlang export, public deploy, leaderboards, etc.)

## Key Implementation Notes (carry forward)

- **Persona injection is at the call site** -- `build_messages()` signature unchanged. Injection happens in the agent loop immediately before calling `build_messages()`. Pattern: `agent_system = f"You are {p.name}. {p.personality}\n\n{system_prompt}"` if persona set, else bare `system_prompt`.
- **Documentary uses sync litellm wrapped in asyncio.to_thread** -- `asyncio.to_thread(litellm.completion, model=..., messages=..., max_tokens=1500)`. This avoids any async loop conflicts with litellm's async path.
- **RPG memory reuses model_memory table** -- no schema changes. Key overloading: `model_b = "rpg:{preset}"`. `get_memories_for_pair(dm_model, f"rpg:{preset}")` naturally scopes to DM + preset combo. Up to 3 past memories injected as "CAMPAIGN HISTORY:\n{block}".
- **Documentary violet tint** -- in App.tsx AppInner routeTint, check `loc.includes('/documentary')` alongside `/tree` for violet (138,92,246).

## Phase 16 Files (15 total)

**New files (2):** `server/routers/personas.py`, `ui/src/pages/Documentary.tsx`
**Backend (5):** `server/db.py`, `server/relay_engine.py`, `server/rpg_engine.py`, `server/routers/relay.py`, `server/routers/experiments.py`, `server/app.py`
**Frontend (7):** `ui/src/api/types.ts`, `ui/src/api/client.ts`, `ui/src/pages/Settings.tsx`, `ui/src/pages/Configure.tsx`, `ui/src/App.tsx`, `ui/src/pages/Analytics.tsx`, `ui/src/components/theater/RPGTheater.tsx`

---

## Status: PHASE 16 SHIPPED (PENDING COMMIT + SMOKE TESTS)
All 15 files implemented. TypeScript: 0 errors. Python: 0 syntax errors.
Next action: commit then smoke test personas + documentary + campaign persistence.