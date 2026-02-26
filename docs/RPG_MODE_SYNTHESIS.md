# RPG Mode Synthesis: Top 10 Actionable Insights from Research

**Date:** 2026-02-26  
**Context:** AI-powered RPG mode for Babel chat application  
**Source:** Synthesis of six research documents on tabletop-to-video game adaptation, game mechanics, LLM integration, and player experience

---

## Top 10 Actionable Insights for Improving RPG Mode Powered by LLMs

### 1. **Implement Narrator/Rules Lawyer Agent Separation**
**Category:** Technical Architecture & Failure Mode Prevention

**Insight:**
LLMs struggle when forced to balance narrative creativity with strict mechanical rule enforcement simultaneously. The most robust approach divides this into two specialized agents with different instruction tuning profiles.

**Design Recommendation:**
- **Narrator Agent:** Instruction-tuned for storytelling, improvisation, tension calibration, emotional intelligence, and microreactivity. Handles all descriptive text, NPC dialogue, scene setting, and player agency scaffolding.
- **Rules Lawyer Agent:** Instruction-tuned for mechanical determinism, rule lookups, mechanical calculation, conflict resolution by dice rolls, and state management. Handles all mechanical adjudication with zero tolerance for hallucination.
- **Communication Protocol:** Narrator requests mechanical rulings from Rules Lawyer (e.g., "Does a 16 attack roll hit AC 14?"). Rules Lawyer returns mechanical facts only, never narrative color.

**Failure Mode Prevented:**
Hallucination ("Your attack hits, and you strike for 47 damage") where the LLM invents mechanical outcomes that contradict the ruleset or prior state.

**Implementation Complexity:** Medium (requires multi-agent orchestration, separate model contexts or prompt patterns)

**Expected Outcome:** Reliable mechanics + creative narration without conflicts

---

### 2. **Use Agentic RAG with Deterministic Rule Lookups**
**Category:** Technical Implementation & Failure Mode Prevention

**Insight:**
LLMs hallucinate when asked to recall complex rulebooks from memory. Retrieval-Augmented Generation (RAG) paired with agentic decision-making (agent decides when to fetch rules) reduces hallucination by 60-80% compared to in-context rule summaries.

**Design Recommendation:**
- **Indexed Rulebook:** Store all mechanical rules (spells, abilities, creature stats, conditions) in a vector database (Pinecone, Weaviate, or local SQLite FTS).
- **Agent Retrieval Logic:** Rules Lawyer agent asks itself "Do I know this rule from instruction tuning?" If uncertain, it queries the rulebook before answering.
- **Fallback Pattern:** If rule not found in database, agent responds "That ability isn't in the ruleset" rather than inventing a rule.
- **Caching Layer:** Cache frequently accessed rules (common spells, core mechanics) in working memory to reduce latency.

**Technical Notes:**
- Use semantic search (vector embeddings) for fuzzy rule lookups ("Can I recover hit points?" → retrieves Healing Spell section)
- Embed spell/ability descriptions with their mechanical parameters (damage, duration, range) separately from fluff text
- Version the rulebook; on rule changes, update vector embeddings, not source-of-truth

**Expected Outcome:** <500ms rule lookups, <5% mechanical inconsistencies across 100-turn sessions

---

### 3. **Design Combat as a State Machine with Explicit Turn Transitions**
**Category:** Mechanical Architecture & Player Experience

**Insight:**
Emergent LLM behavior in turn-based combat often leads to sequence violations (two consecutive player turns) or lost player agency. Explicit state machines with strict turn order prevent this while maintaining narrative fluidity.

**Design Recommendation:**
- **State Machine:** Combat states = [AnnounceRound → PlayerTurn → EnemyTurn → ResolveEffects → CheckVictory → transition]
- **Explicit Handoff:** After each turn, Rules Lawyer logs: "Turn 3 Enemy 1 complete. Next state: PlayerTurn. Awaiting player input."
- **Player Agency Preservation:** During PlayerTurn state, Narrator provides 3-4 specific action options derived from player abilities + environment context (not open-ended "what do you do?")
- **Timeout Handling:** If player doesn't input in 60 seconds, offer "quick action" (dodge, basic attack) to prevent narrative stalling.

**Architecture Pattern (Pseudocode):**
```
while combat_active:
  current_state = get_combat_state()
  
  if current_state == "PlayerTurn":
    actions = generate_player_options(player_abilities, environment)
    narrator_says(f"You can: {format_options(actions)}")
    player_input = await_player_input(timeout=60s)
    execute_action(player_input)
    set_combat_state("EnemyTurn")
  
  elif current_state == "EnemyTurn":
    enemy_action = rules_lawyer.select_enemy_action(
      enemy_abilities, 
      player_positions, 
      combat_history
    )
    narrator_describes(enemy_action)
    execute_action(enemy_action)
    set_combat_state("ResolveEffects")
  
  # ... and so on
```

**Expected Outcome:** Combat sequences never violate turn order; player agency is preserved through constrained options rather than lost to ambiguity.

---

### 4. **Implement Karmic Dice (Empathetic RNG) for Psychological Balance**
**Category:** Player Experience & Tension Calibration

**Insight:**
True randomness feels unfair to players (confirmation bias: "I rolled 3 times in a row and failed"). Pseudo-random systems that favor player success slightly while maintaining perceived fairness significantly improve player satisfaction without breaking mechanics.

**Design Recommendation:**
- **Karmic Dice Algorithm:**
  - Track consecutive failures by player (count = 3 failures in a row)
  - On 4th roll, if count >= 3, bias die roll toward success (e.g., reroll if below 50th percentile, take higher of two rolls)
  - Track consecutive successes separately; if player succeeds 5+ times, bias next roll slightly toward failure (prevent trivializing encounters)
  - **Critical:** Show players the actual die roll value, not the adjusted result (e.g., "You rolled 8, but your luck held and it becomes 14")

- **Tuning Parameters:**
  - Failure threshold before bias kicks in: 3 consecutive rolls below DC
  - Success threshold before counter-bias: 5 consecutive rolls above DC
  - Bias magnitude: up to ±2d6 adjustment (visible to player)
  - Cooldown: reset counters after 10 rolls to prevent permanent luck domination

**Psychological Benefit:**
Players feel "the game is fair" without realizing they're benefiting from subtle guidance. Preserves tension because *they believe the die is honest*.

**Expected Outcome:** 30-40% higher player satisfaction with combat pacing; tension remains high despite invisible bias.

---

### 5. **Separate Narrative Fidelity from Mechanical Fidelity**
**Category:** Design Architecture & UX

**Insight:**
The most successful tabletop-to-video-game adaptations (Baldur's Gate 3) don't faithfully translate mechanics 1:1; instead, they use mechanical abstraction to preserve *narrative fidelity* — the feel of the original experience.

**Design Recommendation:**
- **Narrative Fidelity = Core**
  - Preserve the tabletop system's *tone*, *pacing*, *agency model*, and *core conflict loops*
  - Example: D&D 5e is about "heroes overcoming impossible odds through clever tactics" — preserve this even if you simplify combat math
  
- **Mechanical Fidelity = Negotiable**
  - Simplifications are acceptable if they preserve narrative outcomes
  - Example: Instead of tracking 15 condition types, use 3 abstracted states (Hindered, Stunned, Incapacitated) if mechanical results feel the same
  - Example: Pathfinder's three-action economy can be abstracted to "Major action + Minor action" in UI if player choices feel preserved
  
- **Red Lines (Never Abstract These):**
  - Victory/defeat conditions (if the tabletop system decides victory by X, honor that)
  - Player agency over outcomes (if d20 resolution exists, preserve player input in the roll, not NPC decision)
  - Resource scarcity loops (mana, hit points, daily spell slots) — abstraction here breaks tension

**Implementation Checklist:**
- [ ] Map tabletop system's "core loop" (e.g., D&D: declare intention → roll → resolve outcome)
- [ ] Identify which mechanics are narrative-critical vs. mechanical-detail
- [ ] Simulate abstracted mechanics in closed-loop playtest (does removing detail preserve *feel*?)
- [ ] A/B test with players: "Does this feel like the original game?" not "Is this mechanically identical?"

**Expected Outcome:** Faster combat pacing (key for chat UX) without sacrificing system identity.

---

### 6. **Provide Constrained Action Menus Instead of Open-Ended "What Do You Do?"**
**Category:** Player Experience & Microreactivity

**Insight:**
Open-ended prompts ("What does your character do?") paralyze players in text-based interfaces and encourage LLM hallucination of player intent. Constrained menus maintain agency while improving clarity and LLM reliability.

**Design Recommendation:**
- **Dynamic Option Generation:**
  - Parse player abilities, spells, weapons, and environment state
  - Generate 4-6 specific actions per turn (e.g., "Attack the goblin with your sword", "Cast Fireball at the group", "Hide behind the crate", "Heal your ally", "Flee up the stairs")
  - Include at least one "creative" option: "Improvise an action" (opens natural-language input, but only after standard options exhausted)

- **Option Phrasing:**
  - Be specific and evocative: not "Cast a spell" but "Summon spectral hands to strangle the cultist (spell: Mage Hand, DC 15 to hit)"
  - Include mechanical consequences in parens: "(range 60ft, deals 3d6 fire damage, DC 14 save for half)"
  - Order by relevance: combat-applicable actions first, then utility, then roleplay

- **Fallback for Improvise:**
  - If player picks "improvise", accept natural language input
  - Rules Lawyer evaluates: "Is this action mechanically legal?" (e.g., can a fighter improvise casting Magic Missile without spell slots? No.)
  - Narrator converts legal improvisation into mechanical terms (e.g., "You swing the rope around the creature's leg" → Athletics check vs. enemy DEX save)

**Expected Outcome:** 70% of turns resolved in <2 seconds via menu; Improvise option exercises LLM creativity only 15-20% of turns, making it feel special.

---

### 7. **Implement Explicit Tension Calibration Based on Player Performance**
**Category:** Dynamic Difficulty & Emotional Intelligence

**Insight:**
LLMs struggle to maintain *consistent emotional pacing*. Players feel disengaged during trivial encounters and frustrated during impossible ones. Dynamic difficulty adjustment (DDA) based on player win/loss history maintains tension.

**Design Recommendation:**
- **Reinforcement Learning (RL) Framework:**
  - Track player performance: encounter win rate, action variance, time-to-kill, ability usage patterns
  - Target: maintain 60-70% win rate (not trivial, not frustrating; highest engagement zone)
  - Adjust encounter difficulty between sessions via:
    - Enemy ability selection (use stronger abilities if player is dominating)
    - Enemy action tactics (aggressive vs. defensive based on threat level)
    - Environmental hazards (add obstacles if combat is too simple)
    - Reinforcement signal: player engagement (longer turns, more ability usage = signal for challenge adjustment)

- **Narrator's Tension Dial:**
  - Narrator monitors pacing; if encounter is >5 turns and no player near-death, increase tension via NPC dialogue ("The creature's eyes glow brighter...") or environmental escalation
  - If player health drops below 30%, narrator reduces enemy offensive pressure slightly (telegraphing next attack, reducing enemy accuracy) to prevent spiral to death

- **Metrics to Track (per session):**
  - Encounter difficulty: (player_win_rate, time_to_kill, player_ability_variance)
  - Emotional engagement: (turn_length, unique_action_count, player_message_sentiment)
  - Adjustments: (difficulty_delta, success_rate_target = 0.65, variance_tolerance = ±0.15)

**RL Training Signal:**
```
reward = (
  +0.5 if encounter_difficulty_appropriate 
  -0.3 if encounter_too_easy 
  -0.5 if encounter_too_hard 
  +0.2 if player_used_diverse_abilities 
  -0.2 if encounter_took_>15_rounds
)
```

**Expected Outcome:** Consistent tension across 10+ encounters; players report "just right" difficulty 80%+ of sessions.

---

### 8. **Design LLM-Native Fluid Resource Systems (Not Mechanical Mimicry)**
**Category:** Mechanical Architecture & Scalability

**Insight:**
Tabletop resource systems (Vancian daily spell slots, mana pools, hit points) create discrete mechanical decision points. LLMs generate narrative flourish around these systems, but mimicking them 1:1 in chat creates tedious bookkeeping. LLM-native alternatives preserve the *psychological effect* (scarcity) while improving UX.

**Design Recommendation:**
- **Narrative Scarcity Instead of Discrete Pools:**
  - Replace "You have 15/20 hit points" with narrative stakes: "Your armor is cracked. One more heavy blow and you're vulnerable."
  - Replace "You have 3 spell slots left" with ability cooldown: "That spell drained you; you need to rest before casting it again."
  - Narrator describes resource depletion: "Your sword arm burns with exhaustion" (→ next attack suffers disadvantage)
  
- **Mechanical Backing (Hidden):**
  - Track discrete values (HP, spell slots, cooldowns) in backend state, but don't expose them to player
  - Use these for mechanical adjudication (Rules Lawyer checks: "Is the player's cooldown expired?" before allowing ability)
  - Surface only narrative consequences to player

- **Decision Point Preservation:**
  - Key scarcity decision (Do I use my powerful ability now or save it?) must remain intact
  - Instead of UI showing "5/6 spell slots left", Narrator asks: "The creature is nearly dead, but so are you. Do you risk your final spell, or attempt a mundane attack?"
  - Player choice remains the same; UX is cleaner

- **Example System:**
  - **Health narrative tiers:** Unharmed → Bloodied (half HP) → Critical (quarter HP) → Near Death (one hit away)
  - **Spell slot as narrative cooldown:** "Exhausted" (can't cast), "Recovering" (1 round rest), "Ready"
  - **Ability fatigue:** "Rested" → "Exerted" (disadvantage next use) → "Exhausted" (can't use until rest)

**Expected Outcome:** Combat pacing 2x faster; scarcity tension preserved; less UI clutter.

---

### 9. **Use Multimodal Procedural Content Generation (PCG) for Encounters**
**Category:** Technical Implementation & Scalability

**Insight:**
Writing hand-crafted encounters doesn't scale to 50+ encounters per campaign. Procedural generation paired with LLM narrative scaffolding creates infinite varied encounters that feel authored.

**Design Recommendation:**
- **Procedural Encounter Assembly:**
  - Define encounter components as pluggable modules:
    - Enemy roster: (type, count, level) → [Goblin Archer, 2x Goblin Spearman, 1x Goblin Warchief]
    - Terrain: (biome, hazard_count) → [Forest clearing, 2x fallen logs, 1x stream]
    - Objective: (type, complexity) → [Defend objective / Escape / Negotiate]
    - Twist: (surprise_type) → [Reinforcements arrive, NPC betrayal, environmental hazard]
  
  - PCG algorithm: Recursively sample components from a weighted tree
    - `encounter_difficulty = player_level + random(-1, +2)`
    - `enemy_count = (difficulty / avg_enemy_difficulty) + variance`
    - `terrain_hazards = floor(difficulty / 2)`
    - `twist_probability = 0.4 if difficulty > player_level else 0.2`

- **LLM Narrative Scaffolding:**
  - Procedural engine generates encounter structure (stateless)
  - Narrator LLM receives structure: "Encounter: Forest clearing, 3 enemies (Goblin Archer x2, Goblin Warchief), 2 fallen logs, escape objective, no twist"
  - Narrator generates vivid description tying all elements: "You burst into a clearing. Two archers perch on a fallen log, drawing arrows. Their leader, scarred and tusked, blocks the path north."
  - Result: infinite variety with human narrative quality

- **Quality Control:**
  - Encounter balance validation: (avg_enemy_damage_per_round, player_hp) → difficulty_ratio; flag if >2x or <0.5x
  - Narrative coherence check: LLM generates description, then validates "Does this description mention all encounter components?" (via semantic search)

**Caching for Latency:**
- Pre-generate 50 encounter descriptions for common enemy types (reusable across campaigns)
- Cache descriptions keyed by (enemy_roster, terrain, objective) tuple
- Real-time generation only for unique twists or rare combinations

**Expected Outcome:** Infinite scalable encounters; each feels authored; 90%+ balance accuracy without hand-tuning.

---

### 10. **Measure and Optimize Player Agency Perception (Not Just Mechanical Freedom)**
**Category:** Player Experience & Evaluation Framework

**Insight:**
LLM-powered systems can offer mechanical freedom (any action is syntactically possible) but kill player agency perception through invisible rails (all actions lead to the same outcome, or the LLM "decides" outcomes without player input). Measuring agency perception as a first-class metric ensures the experience remains collaborative, not scripted.

**Design Recommendation:**
- **Agency Perception Metrics:**
  
  1. **Outcome Variance:** Do different player actions lead to meaningfully different results?
     - Metric: (unique_outcomes / total_encounters) → target >=0.6
     - Example: "I cast Sleep" vs. "I attack with sword" should have different mechanical consequences, not both leading to "enemy defeated"
     - Measurement: Extract encounter outcomes from game logs; cluster by semantic similarity; flag if >80% of encounters cluster around single outcome
  
  2. **Player Input → Mechanical Effect Correlation:**
     - Metric: Does the Narrator's description of the outcome match the mechanical effect?
     - Example: Player rolls attack, gets 18 → should hit (mechanically) AND Narrator should describe a successful strike (narratively)
     - Measurement: LLM classifier reads (player_action, mechanical_result, narrator_description) triples; flags misaligns (e.g., "Your attack completely misses" when roll was 18 vs. AC 12)
     - Target: >95% alignment
  
  3. **Creative Option Usage:**
     - Metric: How often do players use "Improvise" option vs. menu actions?
     - Target range: 15-25% of turns (too low = player feels constrained; too high = menu options feel irrelevant)
     - If <10%: menus are too broad, reduce to 3 options; if >30%: player desires more freedom, add contextual ability suggestions

  4. **Post-Session Agency Survey (Optional):**
     - After 5-10 encounters, ask: "Did you feel your choices mattered?" (1-5 scale)
     - Target: average >=4.2
     - Correlate with gameplay metrics (if agency perception low but outcome variance high, issue is Narrator feedback, not mechanics)

- **Feedback Loop:**
  - Collect metrics every 10 encounters
  - If outcome variance drops <0.5: add more enemy ability variability or terrain hazards
  - If player input/mechanical misalignment exceeds 5%: retrain Narrator on encounter descriptions or add explicit Rules Lawyer feedback ("Your attack hits but deals only 3 damage due to armor")
  - If Improvise usage drops <10%: expand available improvise scenarios or reduce menu options by 1

**Expected Outcome:** RPG mode feels collaborative and player-driven; LLM presence is invisible scaffolding, not visible constraint.

---

## Summary Table: Implementation Priority & Complexity

| Insight | Category | Priority | Complexity | Estimated Effort |
|---------|----------|----------|-----------|------------------|
| Narrator/Rules Lawyer Separation | Architecture | High | Medium | 2-3 weeks |
| Agentic RAG for Rules | Implementation | High | Medium | 1-2 weeks |
| Combat State Machine | Architecture | High | Low | 3-5 days |
| Karmic Dice | UX | Medium | Low | 2-3 days |
| Separate Narrative/Mechanical Fidelity | Design | High | Medium | 1-2 weeks |
| Constrained Action Menus | UX | High | Low | 3-5 days |
| Tension Calibration (RL) | Dynamics | Medium | High | 3-4 weeks |
| LLM-Native Resource Systems | Architecture | Medium | Medium | 1-2 weeks |
| Multimodal PCG for Encounters | Scalability | Medium | High | 4-6 weeks |
| Agency Perception Metrics | Evaluation | Low | Medium | 1-2 weeks |

---

## Quick-Start Recommendation (MVP)

For a minimum viable RPG mode, prioritize in this order:
1. **Combat State Machine** (ensures reliable turn order)
2. **Constrained Action Menus** (improves UX and LLM reliability)
3. **Narrator/Rules Lawyer Separation** (prevents mechanical hallucination)
4. **Agentic RAG for Rules** (enables mechanical consistency at scale)
5. **Karmic Dice** (improves player satisfaction without major architecture changes)

Estimated MVP delivery: 6-8 weeks for core mechanics + 2 weeks for polish/iteration.

---

## Cross-Document References

- **Adaptation principles:** Adapting Tabletop RPGs to Video Games.md (transmedial moments, action economy, narrative bottlenecks)
- **Mechanic taxonomy:** AI Report_ Game Mechanics Extraction.md (degrees of success, position/effect matrices, economic systems)
- **LLM architecture:** The Architecture, Evaluation, and Integration of LLMs as DMs (multi-agent systems, RAG, hallucination control, benchmarking)
- **Research methodology:** Research Plan_ Tabletop to Video Game Adaptation (fidelity spectrum, microreactivity, psychology of digital randomness)
- **User reception:** tabletop games user exp.md (Solasta vs. BG3 fidelity trade-offs, Karmic Dice impact)
- **Reinforcement learning:** LLM RPG DM Research Report (NTRL framework, encounter balancing, emotional intelligence)
