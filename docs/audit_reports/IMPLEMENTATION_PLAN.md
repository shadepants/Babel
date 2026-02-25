# IMPLEMENTATION PLAN: Master Roadmap (COMPLETED)

All phases of the Babel architectural and operational upgrade are verified and implemented.

## Phase A: Security & Quick Wins (Immediate)
- [x] **TASK A1:** Dynamic `SHARE_PASSWORD` generator in `server/app.py`.
- [x] **TASK A2:** `useId()` implementation in `SpriteAvatar.tsx` for SVG safety.
- [x] **TASK A3:** `.font-symbol` class and icon wrapping for Orbitron fallback.

## Phase B: UI Flow Overhaul
- [x] **TASK B1:** Direct SeedLab-to-Campaign navigation.
- [x] **TASK B2:** DM model selection moved into `Campaign.tsx`.
- [x] **TASK B3:** Removed RPG toggles from `Configure.tsx` (Double Config fix).
- [x] **TASK B4:** End-of-Session overlay modal implemented in both Theater views.

## Phase C: Core Resiliency & Performance
- [x] **TASK C1:** Persistent Event Buffer (SSE history survives restart).
- [x] **TASK C2:** Background Writer Queue (Removed global DB write bottleneck).
- [x] **TASK C3:** RPG Session Recovery (Campaigns resume from last state).

## Phase D: Phase 17 - Layered Context (Epic)
- [x] **TASK D1:** Asymmetric Context (Fog of War / Privacy layers).
- [x] **TASK D2:** Background Summarizer Engine (Cold Context recaps).
- [x] **TASK D3:** Layered Prompt Construction (Frozen + Cold + Hot).

## Phase E: Gameplay Mechanics
- [x] **TASK E1:** Strict Mode vocab filtering (Reduced noise in non-conlang).
- [x] **TASK E2:** Visual Choice Architecture (3D Dice Roll animations).
- [ ] **TASK E3:** Zero-Sum Pressure Valve (Draft/Design complete; implementation pending future requirement).

## Phase F: Operational Refinement
- [x] **TASK F1:** Port-based process termination (:8000).
- [x] **TASK F2:** Portable `.ps1` relative paths ($PSScriptRoot).
- [x] **TASK F3:** Lazy dependency loading in `share.ps1`.
- [x] **TASK F4:** Localtunnel connection verification.
