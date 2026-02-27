# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-27 (Session 24 -- end of session)
**Active Agent:** Claude Code
**Current Goal:** Priority list execution from session 23 backlog -- COMPLETE, COMMITTED

---

## What Was Done This Session

### 1. A1 Smoke Test -- Verified (code inspection)
`DM_BLOCKED_MODELS = ['gemini/gemini-2.5-pro', 'groq/']` at Campaign.tsx:31-34.
Filter applied via `.startsWith()` at line 344 -- confirmed correct. Browser verification
attempted but preview_start frontend config needed fixing first (see item 3).

### 2. Campaign Memory Enrichment (B1-B4) -- SHIPPED `3c98e2b`
Upgraded RPG session memory from thin 200-500 char strings to rich LLM-generated chronicles.

**db.py:**
- `entity_snapshots` table (match_id PK, dm_model, preset_key, snapshot_json, generated_at)
- `save_entity_snapshot(match_id, dm_model, preset_key, snapshot_json)`
- `get_entity_snapshots_for_pair(dm_model, preset_key, limit=2)` -- keyed on (dm_model, preset_key), newest first

**summarizer_engine.py:**
- `generate_entity_snapshot(match_id, db, model)` -- calls gemini/gemini-2.5-flash with
  world_state JSON + cold_summary + last 15 turns; returns structured dict or None on failure

**rpg_engine.py:**
- `_save_entity_snapshot_bg()` -- background task, fires at session end alongside `_save_rpg_memory`
- Prior snapshot injection at session start (lines 192-215): fetches latest snapshot for
  (dm_model, preset_key) and prepends `PRIOR SESSION ENTITY CHRONICLE:` to system_prompt

### 3. Dev Tooling -- .claude/launch.json
Fixed and stabilised `preview_start` configs. Frontend Vite server required passing the
`ui/` directory as a positional root argument to vite.js (not --config flag, not npm.cmd).
Working config: `node vite.js C:\...\ui` -- vite resolves node_modules from the given root.

---

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| A1: Gemini Pro absent from DM dropdown | VERIFIED | Code inspection, Campaign.tsx:344 |
| Import check (rpg_engine + summarizer) | PASSED | `imports OK` via Start-Process |
| `3c98e2b` committed + pushed | DONE | On master |
| A2: Visual test -- companion colors, theater UI | UNVERIFIED | Needs live RPG session |
| A3: P11 regression -- phantom NPC guard | UNVERIFIED | Needs live RPG session with Deepseek DM |
| Entity snapshot end-to-end (DB row populated) | UNVERIFIED | Needs a completed RPG session |

---

## Next Steps

1. [ ] **A2 visual test** -- start servers, run pure-AI session (3 AI companions, no human),
       confirm: DM italic prose + amber border, companion character card headers,
       distinct colors (violet/rose/sky/orange), NarrativeArcBar advances, observer status bar
2. [ ] **A3 P11 regression** -- Deepseek as DM + 2 non-Groq companions, 6-8 rounds,
       confirm no `[Name]: dialogue` pattern inside DM narration blocks
3. [ ] **Entity snapshot quality check** -- after a session ends, run:
       `SELECT match_id, generated_at, snapshot_json FROM entity_snapshots LIMIT 5`
       Confirm non-empty snapshot with expected keys (npcs, locations, items, unresolved_threads, party_arcs)
4. [ ] **Future:** Expose entity snapshot in `/rpg-context` endpoint and surface history arcs in WorldStatePanel UI

---

## Key Files Modified This Session
- `server/db.py` -- entity_snapshots table + save/get methods (lines 169-176, 1457-1485)
- `server/summarizer_engine.py` -- generate_entity_snapshot() function (lines 93-148)
- `server/rpg_engine.py` -- _save_entity_snapshot_bg(), session-end task, session-start injection (lines 57-68, 192-215, 480-488)
- `.claude/launch.json` -- dev server configs (gitignored)
- `CONTEXT.md` / `HANDOFF.md` -- updated this session
