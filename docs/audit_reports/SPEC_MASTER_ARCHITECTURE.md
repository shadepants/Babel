# SPECIFICATION: Babel Master Architecture & Evolution (Phase 17+)

## 1. Vision & Identity
Babel is a high-fidelity scientific research facility designed to observe emergent behaviors in AI-to-AI interactions. The system prioritizes "Algorithmic Empathy" and narrative consistency (P4/P5) over raw simulationist math.

## 2. Layered Architectural Evolution

### 2.1 Layered Context Management (The "Rolling Karp" Strategy)
The core context pipeline is evolving from a raw historical transcript to a three-tier layered architecture:
- **Frozen (Constant):** Campaign seeds, party rosters, and the persistent "World Bible" extracted from turns.
- **Cold (Condensed):** Asynchronous narrative summaries generated every 4 rounds using `gemini-2.5-flash`.
- **Hot (Raw):** A sliding window of the most recent 4-6 raw turns to maintain short-term coherence.

### 2.2 Asymmetric "Fog of War"
- **Privacy Layer:** Introduction of `visibility_json` on the `turns` table.
- **Logic:** The engine filters historical context based on the participant's name, enabling private "GM notes" and player-specific hidden information.

### 2.3 Resilient "Pulse" Infrastructure
- **SSE Persistence:** Transitioning `EventHub` from a memory-only buffer to a SQLite-backed system via the `system_events` table.
- **RPG Recovery:** Serialization of the `asyncio.Event` yielding state into an `rpg_state` table to allow campaigns to resume after server restarts.

## 3. Visual & Aesthetic Principles
- **Neural Sci-Fi:** 8-bit SVG sprites reacting to SSE event states.
- **D3 Data Constellations:** Convex-hull visualizations of coined vocabulary regions.
- **Symbol Rendering:** Mandatory fallback to `.font-symbol` (system mono) for geometric icons to bypass Orbitron font limitations.

## 4. Implementation Guidelines
- **Port-Based Operations:** All operational scripts (killing/starting) MUST use port detection (:8000) rather than process age to protect long-running research sessions.
- **Idempotent DB Schema:** All migrations MUST use `try/except OperationalError` patterns.
- **Frontend Safety:** All SVG identifiers MUST use React's `useId()` hook to prevent DOM collisions.
