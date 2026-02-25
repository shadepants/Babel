# BABEL TECHNICAL AUDIT & REMEDIATION REPORT
**Date:** 2026-02-25  
**Auditor:** Gemini CLI (Deep Dive Audit)  
**Scope:** Full-stack (FastAPI Backend, React Frontend, SQLite Substrate)

---

## 1. Critical Architectural Gaps

### [ISSUE-001] RPG Session Non-Recoverability
- **Symptom:** On server restart, all active RPG campaigns are marked as "failed" in the database.
- **Root Cause:** `rpg_engine.py` relies on ephemeral in-memory state (the `asyncio.Event` human-yielding lock and the current participant turn index) which is not serialized to SQLite.
- **Impact:** High. Long-form RPG sessions (10+ rounds) are fragile and cannot survive server maintenance or crashes.
- **Proposed Fix:** 
    - Create an `rpg_state` table in SQLite to store the `current_speaker_index`, `is_awaiting_human` flag, and `campaign_metadata`.
    - Modify the `recover_stale_sessions` task to rebuild the `asyncio.Event` and resume the RPG loop from the last saved state.

### [ISSUE-002] Volatile SSE History (Memory Only)
- **Symptom:** Reconnecting clients (using `Last-Event-ID`) see a blank screen if the server has restarted since the last event was fired.
- **Root Cause:** `EventHub.py` stores its 2000-event history buffer purely in RAM.
- **Impact:** Medium. Degrades the "Event-Sourced UI" promise of perfect synchronization across refreshes.
- **Proposed Fix:** 
    - Implement a `system_events` table in SQLite.
    - On server shutdown (lifespan cleanup), serialize the `EventHub` buffer to disk. On startup, hydrate the buffer from the last 1000 records in SQLite.

---

## 2. Performance & Code Inefficiencies

### [ISSUE-003] Global DB Write Serialization (Bottleneck)
- **Symptom:** High latency during multi-session stress tests or large tournaments.
- **Root Cause:** `server/db.py` uses a single `self._write_lock = asyncio.Lock()` for every `INSERT` or `UPDATE` across all tables.
- **Impact:** Medium. While it prevents SQLite `busy` errors, it serializes non-conflicting writes (e.g., writing a turn for Match A shouldn't block writing a turn for Match B).
- **Proposed Fix:** 
    - Transition to a **Background Writer Pattern**. Use an `asyncio.Queue` to collect all write operations and have a single dedicated worker thread/task process them. This offloads I/O from the API request loop.

### [ISSUE-004] Linear Context Growth (Token Decay)
- **Symptom:** Increased API costs and narrative "plateaus" in long sessions.
- **Root Cause:** `relay_engine.py` rebuilds the full conversation history from the DB for every turn.
- **Impact:** High. 15+ round sessions exceed model context windows or become prohibitively expensive.
- **Proposed Fix (Phase 17):** 
    - Implement **Layered Context Management**. Use a rolling window of the last 5 turns (Hot) + a condensed summary from the `model_memory` table (Cold) + the world-bible seed (Frozen).

### [ISSUE-005] Regex Greediness in Vocab Extraction
- **Symptom:** High noise/false positives (e.g., catching common acronyms as "invented words").
- **Root Cause:** `vocab_extractor.py` uses aggressive ALL_CAPS matching with a static blocklist.
- **Impact:** Low/Medium. Clutters the Dictionary view with garbage data.
- **Proposed Fix:** 
    - Implement a "Strict Mode" toggle in the `.yaml` presets.
    - In non-conlang modes, only extract words that follow a specific definition pattern (e.g., `[WORD] = [DEFINITION]`).

---

## 3. Security & Safety Risks

### [ISSUE-006] Hardcoded Fallback Credentials
- **Symptom:** Potential unauthorized access if `SHARE_MODE` is enabled.
- **Root Cause:** `server/app.py` defaults `SHARE_PASSWORD` to `"babel123"`.
- **Impact:** Medium/High (Environment Dependent).
- **Proposed Fix:** 
    - Change the default to `None`. 
    - On startup, if `SHARE_MODE` is `True` and `SHARE_PASSWORD` is `None`, generate a random 8-character string, print it to the console, and use that as the gate. Force an error if no `.env` value exists.

### [ISSUE-007] Serena Migration "Landmine"
- **Symptom:** Potential for total file corruption during automated code refactoring.
- **Root Cause:** The `Serena` utility uses `re.DOTALL` for multi-line replacements without mandatory boundary markers.
- **Impact:** Low (Dev-time) but catastrophic if triggered.
- **Proposed Fix:** 
    - Update the internal `Serena` library to enforce `start_anchor` and `end_anchor` strings in all replacements to prevent "runaway" regex matches.

---

## 4. UI/UX & Technical Debt

### [ISSUE-008] SVG ID Collisions in SpriteAvatar
- **Symptom:** Flickering or synced animations when multiple avatars are rendered.
- **Root Cause:** `clipPath` IDs in `SpriteAvatar.tsx` were historically static.
- **Impact:** Low (Visual).
- **Proposed Fix:** 
    - Enforce the use of the `useId` React hook for all SVG IDs and `url(#...)` references to ensure globally unique identifiers in the DOM.

### [ISSUE-009] Orbitron Symbol Support
- **Symptom:** Broken "tofu" boxes () in the UI when using geometric symbols.
- **Root Cause:** The Orbitron font lacks glyphs for Unicode geometric symbols.
- **Impact:** Low (Visual).
- **Proposed Fix:** 
    - Add a global CSS class `.font-symbol { font-family: ui-monospace, SFMono-Regular, ...; }` and wrap all non-alphanumeric status icons in this class.

---

## 5. Strategic RPG/Tabletop Enhancements

### [ENH-001] Asymmetric "Fog of War" Context
- **Description:** Implement a privacy layer that prevents models from seeing "Universal Truth" logs.
- **Problem addressed:** Current shared context prevents genuine deception (P13) and betrayal mechanics.
- **Proposed Solution:** Modify `relay_engine.py` to support per-participant message filtering. Store "Private Thoughts" or "Whispers" in the DB with `visibility` metadata.

### [ENH-002] "World Bible" Auto-Hydrator
- **Description:** Background entity extraction for long-form continuity.
- **Problem addressed:** Vocabulary and proper noun decay (P1) in 8+ round sessions.
- **Proposed Solution:** Implement a low-priority background task that extracts NPCs, locations, and status into a `WorldState` JSON object, injected as "Frozen Context" in all turns.

### [ENH-003] "Narrator Discipline" Middleware (P10 Fix)
- **Description:** Output parser to force the DM into third-person narration.
- **Problem addressed:** Claude/Gemini DM models frequently "capture" the player's perspective (P10).
- **Proposed Solution:** Implement a post-processing regex or lightweight LLM check to rewrite first-person DM narration into third-person before the UI render.

### [ENH-004] Visual Choice Architecture (3D Dice)
- **Description:** Inline structured tags for mechanical transparency.
- **Problem addressed:** Lack of trust/transparency in AI-driven RNG.
- **Proposed Solution:** Enable the DM model to output `[CHECK: ...]` tags which `TheaterCanvas.tsx` interprets as a 3D Dice Roll animation.

### [ENH-005] "Zero-Sum" Pressure Valve (P12 Fix)
- **Description:** Automated system intervention to prevent cooperative collapse.
- **Problem addressed:** Adversarial sessions tend to drift into cooperation by Round 3 (P12).
- **Proposed Solution:** A "Judge" model monitors for cooperative drift and injects environmental scarcity (e.g., "Only one can survive") to force conflicting motivations.

---

## 6. Summary Table

| ID | Category | Severity/Impact | Difficulty | Priority |
| :--- | :--- | :--- | :--- | :--- |
| 001 | Architecture | High | Medium | **P0** |
| 004 | Performance | High | High | **P0** |
| ENH-001 | Gameplay | High | High | **P0** |
| ENH-002 | Gameplay | High | Medium | **P0** |
| 006 | Security | Medium | Low | **P1** |
| 003 | Performance | Medium | Medium | **P1** |
| ENH-003 | Gameplay | Medium | Low | **P1** |
| 002 | Architecture | Medium | Low | **P2** |
| ENH-005 | Gameplay | Medium | High | **P2** |
| 008 | UI/UX | Low | Low | **P3** |
| ENH-004 | Gameplay | Low | High | **P3** |
