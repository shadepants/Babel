# GEMINI.md — Babel Master Context & Architectural Strategy

## 1. Project Identity & Vision
**Babel** is a real-time AI-to-AI conversation arena where models (Claude, Gemini, GPT-4, DeepSeek, etc.) co-invent languages, debate, and roleplay. It is a standalone, high-performance web application designed for observing emergent behaviors in LLM-to-LLM interactions.

- **Primary Source:** Inspired by the "SYNTHOLINK" Reddit experiment.
- **Vibe:** "Neural Sci-Fi" / "8-bit Cyberpunk" (Orbitron fonts, amber/cyan glows, pixel-art sprites).
- **Core Loop:** Relay Engine (Symmetric A/B or N-way) $ightarrow$ SSE Stream $ightarrow$ Reactive UI $ightarrow$ Post-hoc Analytics.

## 2. Layered Architecture (The Deep Dive)

### Layer 1: The Engine Room (`server/relay_engine.py`, `server/rpg_engine.py`)
- **N-Way Round Robin:** Supports 2-4 agents. Each agent's turn is a full context rebuild with speaker attribution prefixes (e.g., `[Claude]: ...`).
- **RPG Mode:** Asymmetric participants (DM, Player, AI Party). Uses `asyncio.Event` to "yield" to human input.
- **Resiliency:** Implements exponential backoff retry and a provider failover map (`_FALLBACK_MAP`) for common LLM errors (e.g., Groq $ightarrow$ Cerebras).
- **Fire-and-Forget:** Scoring, Verdicts, and Vocab Extraction run as background tasks to keep the conversation flowing.

### Layer 2: The Data Substrate (`server/db.py`)
- **SQLite WAL Mode:** Essential for concurrent reads (analytics/theater) during heavy write loads (relay engine).
- **Write Serialization:** A strict `asyncio.Lock` (`_write_lock`) in `db.py` protects all `INSERT/UPDATE` operations.
- **Idempotent Migrations:** Schema evolution uses `try/except OperationalError` blocks inside `connect()`.
- **Model Memory:** Pair-keyed summaries stored in `model_memory`. RPG mode overloads this with `rpg:{preset}` keys for campaign persistence.

### Layer 3: The Pulse Pipeline (`server/event_hub.py`)
- **SSE over WebSockets:** Chosen for simplicity and auto-reconnect.
- **Monotonic Event IDs:** Every event has a sequential ID. On reconnect, the UI sends `Last-Event-ID` for history replay.
- **Event Sourcing:** The UI (`useExperimentState`) is a pure function of the SSE event log. This ensures the Theater view is perfectly synced even if the user refreshes.

### Layer 4: The Visual Stage (`ui/src/components/theater/`)
- **SpriteTheater:** Custom SVG-based 8-bit characters with states: `idle`, `thinking`, `talking`, `error`, `winner`, `loser`.
- **TheaterCanvas:** Dedicated Canvas layer for "synaptic pulses" and "vocab bursts" triggered by events.
- **D3 Analytics:** Force-directed graphs (Constellation), growth curves, and a custom Radar Chart (Personality Spider).

## 3. Directional & Contextual Guidance (For AI Assistants)

### How to Guide Babel (Mandatory Patterns)
- **File Encoding:** **NEVER** use PowerShell for file I/O. It corrupts UTF-8. Use `win_write` or equivalent Python tools.
- **Dynamic CSS:** Tailwind classes like `text-${color}` are forbidden. Use the `style={}` prop or explicit mapping.
- **State Management:** Always update `CONTEXT.md` and `HANDOFF.md` after meaningful work.
- **SQL Hardening:** Always use parameterized queries. Never bypass the `db._write_lock`.

### RPG Context Strategy (Phase 17 ACTIVE)
The project is currently moving toward **Layered Context (Option D)**:
1. **Hot Context:** Latest 5-10 turns (raw).
2. **Cold Context:** Summarized older turns.
3. **Frozen Context:** Persistent world-building, NPC bios, and the campaign glossary.
4. **Glossary Extraction:** Auto-extracting coined terms (P1 fix) into a persistent world-state.

### Critical Pitfalls to Avoid
- **Orbitron Font:** Has NO glyphs for Unicode geometric symbols. Use `font-mono` for symbols.
- **StarField Parallax:** Pure canvas implementation. AppInner reads route and passes tint colors.
- **Serena DOTALL:** `.*` regex in replacements can consume the entire file if not anchored correctly.

## 4. Current Trajectory & Tasks
- **Phase 16 (Shipped):** Personas, AI Documentary, RPG persistence.
- **Phase 17 (Next):** Layered Context Management for long-form RPGs.
- **Pending verification:** Persona E2E tests, RPG Documentary generation, Campaign persistence.

## 5. Recursive Audit Findings (Session 2)

### Hidden Behaviors & Edge Cases
- **Session Recovery Limitations:** Standard relays are fully recoverable on startup, but **RPG sessions are marked 'failed'** due to complex in-memory human-yielding state. This is a known gap in Phase 13b.
- **SSE Resilience:** `EventHub` uses a 2000-event history buffer and supports `Last-Event-ID` for selective replay. However, history is **strictly in-memory**; a server restart wipes all active conversation state from the hub (though turns persist in SQLite).
- **Security Guardrails:** The `password_gate` middleware defaults to `babel123` if `SHARE_PASSWORD` is not set in `.env`. This is a risk in `SHARE_MODE`.
- **Model Signature (P9/P10):** 
    - **Groq (Llama 3.3):** Generates naturally short/fast responses (0.8s), making it ideal for background characters but "thin" for protagonists.
    - **Claude/DeepSeek:** Highly prone to **Character Capture (P10)**, where the DM model assumes the identity of a player character. A "Narrator Discipline" guard is now required in system prompts.
- **Cooperative Drift (P12):** Adversarial sessions tend to collapse into cooperation by Round 2-3 unless structural zero-sum win conditions are enforced.

### UI/UX Implementation Details
- **Neural Aesthetic:** `StarField.tsx` uses a 3-layer canvas parallax system with route-aware RGB tints. `ScrambleText.tsx` provides a 2000ms ASCII glyph reveal on mount.
- **Client-Side Sourcing:** The `useExperimentState` hook in `hooks.ts` contains a critical fix where `relay.turn` resets `state.status = 'running'` if it was previously `'error'`, allowing recovery from transient LLM failures.
- **SVG Collision Guard:** `SpriteAvatar` requires a unique `instanceId` to prevent `clipPath` ID collisions when multiple avatars render on the same page.

### Technical Debt & Future Work
- **Context Management:** Current implementation relies on full context windows. Phase 17 is targeted to introduce **Layered Context** (Hot/Cold/Frozen) to support 15+ round sessions without token exhaustion or decay.
- **N-Way Scalability:** While N-way (3-4 agents) is implemented in the DB and relay engine, the Theater UI is currently optimized for 2-column view; N-way renders as centered cards or split columns depending on viewport.

## 6. Recursive Audit Findings (Session 3)

### Deep Logic Subsystems
- **Tournament Engine (`tournament_engine.py`):** Runs matches sequentially to manage provider rate limits. Implements a `TournamentEvent` namespace for lifecycle tracking (STARTED, COMPLETE, CANCELLED, ERROR).
- **Vocab Extractor (`vocab_extractor.py`):** Uses a multi-pass regex strategy. Pass 1 looks for explicit definitions (`WORD = meaning`, `propose WORD to mean`). Pass 2 is an ALL_CAPS catch-all (3+ chars) with a robust English blocklist (`_BLOCKLIST`). Pass 2 is disabled for non-conlang presets to reduce noise.
- **D3 Constellation Graph (`ConstellationGraph.tsx`):** Implements a force-directed simulation with `d3.forceLink` and `d3.forceManyBody`. Uses **Convex Hull logic** (`d3.polygonHull`) with expansion padding to create the glowing "regions" around a participant's coined terms.

### Research Corpus Takeaways (Session f81a5c257ed6)
- **P2/P4 Persistence:** Confirmed that character voice and narrative callbacks (e.g., "Dragon's Heart" term coined R3, used through R6) hold strong over 6+ rounds.
- **DM Model Signature:** Gemini Flash as DM is narratively disciplined but prone to **brief P10 (First-Person Capture)** in Round 1 before self-correcting to second/third person address by Round 2.
- **P5 Escalation:** Confirmed that a 6-act narrative structure (Decoding $\rightarrow$ Impossible Constraint $\rightarrow$ Dangerous Miracle) holds without plateau in long sessions.

### Phase 17: Context Management Roadmap
- **Architecture:** Transitioning to **Layered Context** (Option D).
    - **Frozen:** World Bible / Roster (always injected).
    - **Cold:** Narrative rolling summaries (updated every 2-4 rounds).
    - **Hot:** Full text of latest 4-5 rounds.
- **Auto-Bible:** Implementing background extraction of proper nouns into a persistent session glossary to prevent term decay (P1 fix).

## 7. Recursive Audit Findings (Session 4)

### Research & Stress Infrastructure
- **Stress Runner (`rpg_stress_runner.py`):** An interleaved test rig for 13 targeted sessions. It distributes API load to avoid rate-limit bursts and validates fixes for P10/P11 regressions.
- **Analysis Runner (`rpg_analysis_runner.py`):** The data-gathering engine for the "Scientific" corpus. It automates 4-way DM comparisons and 8-round long-form testing.
- **Hypothesis Tracking (`deferred-patterns.md`):** Current active research targets include **P13 (Deception)**, **P14 (Inferential Confabulation)**, and **P1 (Vocab Decay)** beyond the 5-round zone.

### Visual System Mechanics
- **Preset Glow Map (`presetColors.ts`):** Central registry for background RGBA tints (e.g., `conlang` = purple, `debate` = red).
- **Sprite Animation Logic (`SpriteAvatar.tsx`):** Reactive SVG components with state-driven CSS classes:
    - `sprite-float`: Idle state (sinusoidal offset).
    - `sprite-scan-bar`: Thinking state (animated clipping rect).
    - `sprite-talk-eye`: Talking state (scale pulse).
- **DOM Safety:** Sprites use unique `instanceId` strings for SVG `clipPath` definitions to prevent global ID collisions in the DOM.

### Refined Model Pattern Map
- **P13 (Deception):** Confirmed in Deepseek across 3 rounds. Deception tactics evolve from deflection to manufacturing evidence.
- **P14 (Confabulation):** New candidate pattern where models (specifically Gemini) may invent past dialogue to support a narrative accusation.
- **P12 (Cooperative Drift):** High risk in same-model (Deepseek/Claude) sessions; models synthesize their goals into a unified frame by Round 3 even if zero-sum.

## 8. Exhaustive Corpus Review (Session 5)

### Foundational Feature Specifications
- **Pixel Sprites (Phase 2):** The `SpriteAvatar` system is fundamentally decoupled into three layers: `sprites.css` (pure frame animation), `SpriteAvatar.tsx` (state-to-Y-offset mapping), and `useRelayStream.ts` (state derivation from SSE). Future roadmap includes emotion-driven Y-offsets (row 5: Aggressive) and synced typewriter effects.
- **RPG Expansion (Phase 13):** The human-in-the-loop architecture relies on `server/rpg_engine.py` yielding to a global `asyncio.Event` stored in `request.app.state.human_events[match_id]`. This lock is cleared by the `/api/relay/inject` REST endpoint.

### TTRPG to Digital Adaptation Research
- **RNG Psychology:** Flat randomness (e.g., Unity's `Random.Range`) is mathematically pure but induces severe "confirmation bias" frustration in users. Babel's design philosophy leans toward Larian's "Karmic Dice" or Fire Emblem's "True Hit" curve, prioritizing narrative flow and "Algorithmic Empathy" over strict simulationist math.
- **Narrative Microreactivity:** Traditional dialogue trees are rejected in favor of hidden, aggregate state-machine tracking (e.g., Disco Elysium's Thought Cabinet).
- **Combat Flow:** Turn-Based architecture is mandatory for strict grid logic and spatial manipulation, whereas Real-Time with Pause (RTwP) is suited for managing high-volume "trash mob" pacing. Babel adheres to Turn-Based (via sequential LLM API calls).

### Game Theory & Adversarial Ecosystem
The system contains blueprints for highly complex, non-linguistic stress tests mapped to the `.yaml` preset structure:
- **Prisoner's Dilemma:** Tests self-preservation vs mutual destruction logic.
- **Syntax Virus:** A cascading constraint-satisfaction game where models force new formatting rules on each other.
- **Asymmetric Sensorimotor Relay:** "Theory of Mind" testing where one model instructs another to navigate an unseen grid using only spatial commands.
- **Tragedy of the Commons / Escalating Centipede:** Economic alignment interrogations.

### Root Debugging Suite
The project root contains numerous transient, operational Python scripts (`_check_models.py`, `_db_check.py`, `check_yaml.py`, `_test_litellm.py`, `query_turns.py`). These are purely utility wrappers used for database querying and dependency verification during the development lifecycle and contain no core system logic.

## 10. Systemic Pillars & Philosophical Insights

### The "Pulse" Pipeline & Reactive Core
Babel's most significant architectural strength is its **Event-Sourced UI**. By treating the SSE stream as the single source of truth, the system achieves perfect synchronization between the backend's non-deterministic AI relays and the frontend's deterministic visual state. The "Hybrid Storage" tradeoff (In-memory history vs. SQLite persistence) is a deliberate choice to prioritize real-time throughput over server-restart resilience.

### The Scientific Corpus Philosophy
Unlike traditional "Chat" applications, Babel is a **Research Facility**. Every session is a data point in a growing corpus designed to empirically map the boundaries of LLM cognition. The automation of the `Analysis` and `Stress` runners transforms anecdotal observations (like "DeepSeek is good at RPGs") into verifiable research patterns (like **P13 Deception Persistence**).

### Algorithmic Empathy & Narrative UX
The UI/UX is built on the principle of **Algorithmic Empathy**. Drawing from CRPG history, the system intentionally "fudges" the raw randomness of AI interactions (e.g., through structured seeds and future **Karmic Dice** implementations) to ensure that narrative tension and character consistency (P4/P5) are preserved, even when the underlying models lean toward **Cooperative Drift (P12)**.

### Model-Driven Evolution
The project treats LLMs not as interchangeable utilities, but as distinct "species" with unique behavioral signatures. The persistent mapping of these signatures (e.g., **Groq's brevity**, **Gemini's confabulation**, **Claude's narrator discipline**) allows for the design of "Inter-Agent Ecosystems" where different models are assigned roles that best suit their inherent narrative strengths.

## 11. Session Log Deep-Dive: Emergent Behavioral Patterns

### High-Fidelity Interaction Insights
- **P10 (Character Capture) - The "Vengeance Trigger":** Confirmed that emotionally charged player motivations (e.g., Thorin's 10-year quest for revenge) can pull **Claude Sonnet DM** into total first-person identification, leading to a complete role reversal across 4+ rounds.
- **P11 (Player-Driven Worldbuilding):** Discovered that "Player" models (DeepSeek, Groq) frequently assume DM-like authority, spontaneously naming locations ("The Gutter", "Station Omega") and introducing secondary NPCs ("Cipher", "The Curator") to drive the narrative forward.
- **P12 (Organic Coalitions):** Adversarial multi-party sessions (4+ agents) naturally produce "agree-to-disagree" alliances by Round 2. Models prioritize group survival and artifact retrieval over individual conflicting goals (Study vs. Seal vs. Sell) until the point of final resolution.
- **Model Role Matching:** 
    - **Llama 3.3 (Groq):** Exceptional for "low-latency" greedy characters. Brevity and speed align perfectly with "shifty" or "unreliable" archetypes (e.g., Brix the Goblin).
    - **Claude 3.5 Sonnet:** The gold standard for DM atmospheric narration, though requires strict "Narrator Guards" to prevent P10 capture.
    - **GPT-4o-Mini:** Prone to "narrative overreach," often writing full turn blocks for other players to fill gaps.

### The "Babel" Effect: Semantic Convergence
In conlang and negotiation presets, models reach a "Semantic Singularity" by Round 5-6 where natural language is abandoned for high-density symbolic code. This confirms the project's primary hypothesis: LLMs share a latent communicative space that optimizes for token efficiency when allowed to co-evolve.

## 13. Recursive Verification & Operational Audit

### Operational Tooling
- **Launchers (`start.cmd`, `share.ps1`):** The system uses a multi-window process model. `share.ps1` is the "Production Simulator," explicitly setting `SHARE_PASSWORD=babel123` and launching `localtunnel` for external access.
- **Dependencies:** `tsparticles` is present in `package.json` but currently unused; the `StarField` is a custom high-performance canvas implementation (approx. 60+ nodes with mouse parallax and "Gamma Burst" events).

### Performance & Scaling (Verified)
- **Bottleneck Analysis:** The global `asyncio.Lock` in `db.py` is a verified P1 performance risk during concurrent high-volume stress runs.
- **Recovery Logic:** Verified in `server/routers/relay.py`:
    - **Symmetric Relay:** Fully recoverable (replays turns as `initial_history`).
    - **RPG Mode:** Hard-coded to fail on restart due to non-serialized participant state.

### UX Flow (Verified)
- **Configuration Redundancy:** Confirmed "Rounds" and "Max Tokens" are duplicated between `Configure.tsx` and `Campaign.tsx`, leading to state desync if a user edits one but assumes the other follows.
- **Font Support:** Beyond `Orbitron`, the UI relies on `font-mono` for all data-heavy components to ensure symbol rendering consistency.

## 14. Metadata Registry
- **Backend:** FastAPI (8000), litellm, aiosqlite, SQLite WAL.
- **Frontend:** React 19, Vite, Tailwind, Shadcn UI v4.
- **Models:** Anthropic, Google (Gemini 2.5), OpenAI, DeepSeek, Groq.
- **Primary Font:** Orbitron (Headers), JetBrains Mono (Content).
