# SPECIFICATION: UI/UX & Gameplay Flow Refinements

## 1. Overview
This specification addresses user journey friction, visual inconsistencies, and UI-driven gameplay enhancements to improve the "Algorithmic Empathy" of the application.

## 2. User Flow Optimizations

### 2.1 Bypass "Double Config" & Jarring RPG Transition (FLOW-001, UI-003)
- **Problem:** Users click "RPG Campaign" in `SeedLab`, go to `Configure` (which looks like a standard A/B test), and then go to `Campaign` where they see duplicate "Rounds" and "Max Tokens" sliders.
- **Implementation:**
  - When clicking "RPG Campaign" (or an RPG preset) in `SeedLab`, navigate **directly** to `Campaign.tsx`.
  - Move the "DM Model Selection" directly into `Campaign.tsx`'s party setup.
  - Remove RPG toggles from `Configure.tsx`. 
  - *Result:* Two distinct, clean pipelines: Custom/Standard Relay (`Configure.tsx`) and RPG Campaign (`Campaign.tsx`).

### 2.2 End-of-Session Theater Experience (FLOW-002)
- **Implementation:** When `useExperimentState` detects `status === 'completed'` or `winner !== null`, trigger an overlay modal in `Theater.tsx` containing:
  - "Campaign Complete" / "Winner Declared"
  - Summary stats (Total Turns, Words Coined).
  - Quick actions: `[View Full Analytics]`, `[Remix/Play Again]`, `[Back to Lab]`.

## 3. Visual & Gameplay Enhancements

### 3.1 Visual Choice Architecture (3D Dice) (ENH-004)
- **Implementation:** 
  - Instruct the DM model (via system prompt) to output actions involving chance using tags: `[CHECK: Dexterity DC15 Result: 12]`.
  - Extend `useRelayStream.ts` to parse these tags.
  - Extend `TheaterCanvas.tsx` or create `DiceOverlay.tsx` to render a brief CSS/Canvas dice roll animation over the avatar when a tag is detected, replacing the tag in the text with a stylized `[Dexterity: 12 (Fail)]` badge.

### 3.2 SVG ID Collision Guard (ISSUE-008)
- **Implementation:** Update `SpriteAvatar.tsx`. Use React's `useId()` hook to generate unique prefixes for all `<clipPath id="...">` and `<filter id="...">` elements, ensuring multiple sprites on the same page do not share DOM IDs.

### 3.3 Orbitron Symbol Support (ISSUE-009)
- **Implementation:** Define a global CSS utility class `.font-symbol` mapping to standard system fonts, and apply it to all status dots, geometric decorators, and badges that currently render as "tofu" boxes under the Orbitron font.
