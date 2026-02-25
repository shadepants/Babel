# IMPLEMENTATION ROADMAP: Atomic Task Sprints

This roadmap atomizes the "Vectorized Rolling Karp" plan into 5 prioritized sprints.

## Sprint 1: Security, Safety & Portability (P0)
- [ ] **TASK A1:** Dynamic `SHARE_PASSWORD` generator in `app.py`.
- [ ] **TASK A2:** `useId()` implementation in `SpriteAvatar.tsx`.
- [ ] **TASK A3:** `.font-symbol` class in `index.css` and icon wrapping.
- [ ] **TASK F1:** Refactor `kill_python.ps1` to port-based detection.
- [ ] **TASK F2:** Fix hardcoded absolute paths in `.ps1` scripts using `$PSScriptRoot`.
- [ ] **TASK F5:** Remove hardcoded credentials from `ecosystem.config.js`.

## Sprint 2: UI Flow & UX Optimization (P0-P1)
- [ ] **TASK B1:** Direct SeedLab-to-Campaign navigation (bypass Configure).
- [ ] **TASK B2:** Add DM Model selector to `Campaign.tsx`.
- [ ] **TASK B3:** Remove RPG toggles and "Double Config" logic from `Configure.tsx`.
- [ ] **TASK B4:** Implement "Session Complete" overlay modal in `Theater.tsx`.

## Sprint 3: Phase 17 - Layered Context Core (P0)
- [ ] **TASK D1:** Implement `visibility_json` column and "Fog of War" prompt filters.
- [ ] **TASK D3a:** Create `cold_summaries` and `world_state` tables in `db.py`.
- [ ] **TASK D2:** Create `server/summarizer_engine.py` (Cold Recap + Entity Extraction).
- [ ] **TASK D3b/c:** Refactor `relay_engine` and `rpg_engine` to assemble layered context blocks.

## Sprint 4: System Resiliency (P2)
- [ ] **TASK C1:** Implement `system_events` table and EventHub `serialize/hydrate` logic.
- [ ] **TASK C3:** Implement RPG State persistence and session recovery in `relay.py`.
- [ ] **TASK C2:** (Optional) Transition to Background Writer Queue for DB performance.

## Sprint 5: Gameplay Mechanics & Polish (P2-P3)
- [ ] **TASK E1:** Add `strict_mode` to `vocab_extractor.py` to reduce noise.
- [ ] **TASK E2:** Implement "Visual Choice Architecture" (3D Dice Roll animations).
- [ ] **TASK E3:** Implement Zero-Sum Pressure Valve (Stub/Design phase).
- [ ] **TASK F3:** Implement hash-based lazy `pip install` in `share.ps1`.
- [ ] **TASK F4:** Add Localtunnel connection verification to `share.ps1`.
