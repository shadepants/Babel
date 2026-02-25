# BABEL UI/UX AUDIT & USER FLOW OPTIMIZATION
**Date:** 2026-02-25  
**Auditor:** Gemini CLI (Deep Dive Audit)  
**Scope:** Frontend (React/Vite), User Journey, Visual Consistency

---

## 1. Executive Summary
Babel has a very strong "Neural Sci-Fi" visual identity that successfully communicates its high-tech, experimental nature. However, the user journey suffers from **Configuration Fragmentation**, **Inconsistent Component Usage**, and **Navigation Dead Ends**. The separation between "Standard" and "RPG" modes creates two distinct "apps" that don't share enough common UI DNA.

---

## 2. User Flow Audit

### [FLOW-001] The "Double Config" Trap
- **Problem:** Users configure "Rounds" and "Max Tokens" on the `Configure` page, only to be presented with the same sliders on the `Campaign` page.
- **Impact:** High cognitive load. Users wonder if their previous settings were lost or if these are "different" rounds.
- **Proposed Solution:** 
    - **Single Source of Truth:** Pacing parameters should be set *once*. If `rpgMode` is active, hide them in `Configure` and show them in `Campaign`, or vice versa.
    - **Unified State:** Use a global state (Zustand/Redux) or a robust Context Provider to ensure these settings sync across the `Configure -> Campaign` transition.

### [FLOW-002] Navigation Dead Ends (Theater Exit)
- **Problem:** Once an experiment is finished, the user is "stuck" in the Theater. The link to `Analytics` is small, and there is no clear "Next Action" (e.g., Remix, New Experiment).
- **Impact:** Ends the user session abruptly.
- **Proposed Solution:** 
    - **End-of-Session Card:** When `status === 'completed'`, show a modal or overlay with "Victory/Outcome" stats and three clear buttons: `[View Full Analytics]`, `[Remix Experiment]`, `[Back to Seed Lab]`.

### [FLOW-003] Gallery Discovery
- **Problem:** The Gallery is a flat, chronological list. Finding a specific "Conlang" session from last week is difficult.
- **Impact:** Poor long-term retention of research data.
- **Proposed Solution:** 
    - **Preset Filters:** Add a "Filter by Preset" dropdown.
    - **Search/Labeling:** Promote the "Nickname" feature to be a searchable field in the Gallery.

---

## 3. Visual & Component Audit

### [UI-001] Inconsistent Form Inputs
- **Problem:** `Configure.tsx` uses shadcn `Slider` and `Select`, while `Campaign.tsx` uses a mix of button groups, native `textarea`, and shadcn `Select`.
- **Impact:** The "feel" of the app shifts between pages.
- **Proposed Solution:** 
    - **Standardize:** Audit all form inputs and force them to use the same shadcn/ui components.
    - **Range Wrapper:** Create a `PacingParameter` component that wraps the label, slider, and "preset default" indicator to be reused in both pages.

### [UI-002] Mobile Layout "Cramp"
- **Problem:** The 5-column `StatCard` row in `Analytics.tsx` and the dense `Configure` cards will break on small screens.
- **Impact:** App is unusable on mobile/tablets.
- **Proposed Solution:** 
    - **Responsive Grids:** Update `grid-cols-2 md:grid-cols-5` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`.
    - **Collapsible Sections:** Allow the "Referee" and "Observer" sections in `Configure` to be collapsed by default.

### [UI-003] The "RPG Mode" Jarring Transition
- **Problem:** Clicking "RPG Campaign" in `SeedLab` takes you to `Configure` where you see a standard A/B setup before you even get to the RPG-specific settings.
- **Impact:** Confusing "middle step."
- **Proposed Solution:** 
    - **Bypass Configuration:** If a user clicks a Preset from the RPG Modal, they should go *directly* to the `Campaign` page. `Campaign.tsx` should include the "DM Model" selector at the top, removing the need for the `Configure` middle-man.

---

## 4. Proposed Feature Enhancements (UX)

### [FEAT-UX-001] "Ghost of the Past" (Comparison Overlay)
- **Description:** When viewing `Analytics` for a remixed session, allow the user to overlay the charts from the *original* session.
- **Value:** Visualizes exactly how model changes or temperature tweaks affected the outcome.

### [FEAT-UX-002] AI-Generated Session Summaries
- **Description:** Use the "Judge" model to generate a 2-sentence "TL;DR" for each experiment in the Gallery.
- **Value:** Makes the archive much more browsable at a glance.

### [FEAT-UX-003] Real-time "Pulse" in Gallery
- **Description:** Running experiments in the Gallery should show a "pulsing" border or a live turn counter.
- **Value:** Creates a sense of a "living" laboratory.

---

## 5. Summary Table of Priorities

| ID | Issue | Severity | Effort | Priority |
| :--- | :--- | :--- | :--- | :--- |
| FLOW-001 | Double Configuration | High | Low | **P0** |
| UI-003 | RPG Transition Flow | High | Medium | **P0** |
| FLOW-002 | Theater Dead Ends | Medium | Low | **P1** |
| UI-001 | Input Inconsistency | Medium | Medium | **P1** |
| UI-002 | Mobile Responsiveness | Low | Medium | **P2** |
| FLOW-003 | Gallery Filtering | Low | Medium | **P2** |
