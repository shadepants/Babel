# SPECIFICATION: Phase 17 - Layered & Asymmetric Context Management

## 1. Overview
The current iteration of Babel passes the entire conversation history to the LLM for every turn. In long-form RPG sessions, this results in rapid token window exhaustion, high API costs, and narrative "plateaus" where models lose track of older proper nouns. Furthermore, the shared context prevents asymmetric information ("Fog of War", deception). Phase 17 resolves these issues by overhauling the context pipeline.

## 2. Core Features

### 2.1 Layered Context (Token Decay Fix - ISSUE-004)
The context sent to the LLM will be partitioned into three layers:
- **Hot Context:** The raw transcripts of the N most recent turns (e.g., last 4-6 rounds).
- **Cold Context:** A compressed, rolling narrative summary of all turns prior to the Hot Context window. Generated asynchronously every X rounds.
- **Frozen Context:** The initial campaign hook, participant bios, and the continuously updated "World Bible" (see 2.2).

### 2.2 "World Bible" Auto-Hydrator (Vocab Decay Fix - ENH-002)
- **Mechanism:** A low-priority background task (similar to `vocab_extractor`) that parses completed turns for named entities (NPCs, Locations, Artifacts) and significant state changes.
- **Storage:** Stored in a JSON structure within a new `world_state` table or appended to `experiment_metadata`.
- **Injection:** Injected unconditionally into the **Frozen Context** so models never forget established lore, regardless of token age.

### 2.3 Asymmetric "Fog of War" Context (Privacy Layer - ENH-001)
- **Mechanism:** Extend the `turns` table to include a `visibility` array (e.g., `["DM", "Thorin"]`).
- **Pipeline:** When building the context prompt for a specific agent, `relay_engine` filters out turns where that agent's role is not in the `visibility` array.
- **Gameplay Impact:** Allows the Rogue to "whisper" to the DM, or the DM to maintain private "GM Notes" that players cannot read, enabling genuine deception (P13).

## 3. Technical Implementation
- **Prompt Builder Update:** Refactor the `_build_prompt` logic in `relay_engine.py` and `rpg_engine.py` to aggregate the three layers instead of a raw `SELECT * FROM turns`.
- **Summarizer Agent:** Create `server/summarizer_engine.py` using a fast, low-cost model (e.g., `gemini-2.5-flash`) to generate the Cold Context and extract World Bible entities asynchronously.
