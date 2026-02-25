# **Structural Analysis of Contemporary Tabletop Game Mechanics**

## **Introduction to Modern Ludological Frameworks and Market Context**

The contemporary tabletop gaming industry, encompassing role-playing games, miniature wargames, and complex board games, has experienced unprecedented expansion, reaching a global market valuation of $14.37 billion in 2024, with projections indicating a compound annual growth rate (CAGR) of 10.58%, aiming for a total valuation of $32.00 billion by 2032\.1 Different market analyses present varying valuations, with estimates ranging from $12.2 billion to $21.07 billion for 2024, yet all sources indicate a strong upward trajectory driven by a cultural shift toward offline entertainment.1 Regional distribution reveals that North America dominates with approximately 41.68% of global sales, while the Asia-Pacific region holds a massive 39.5% revenue share, fueled by increasing disposable incomes and the rise of gaming cafes.1

Parallel to the board game explosion, the tabletop role-playing game (TTRPG) sector specifically maintained steady momentum, valued at approximately $1.9 to $2.0 billion globally in 2024\.2 This massive influx of capital has funded a rapid evolution in ludological design. Crowdfunding platforms alone raised $64 million for RPGs in a single year, highlighting the consumer appetite for diverse mechanical frameworks.2 Designers are increasingly tasked with balancing intricate simulationism with streamlined cognitive loads, creating systems that offer deep tactical decision-making without suffering from excessive procedural friction.

A careful examination of the most prominent systems reveals a distinct bifurcation in design philosophies. On one end of the spectrum exist deterministic, granular simulation models that demand rigorous mathematical tracking and sequential resolution. On the opposite end are fiction-first, narrative-driven frameworks that abstract combat and physics into holistic risk-management equations. The underlying mechanics of these systems—how they resolve uncertainty, manage action economies, and sequence player turns—profoundly dictate the psychological engagement and strategic behavior of the player base. This report provides an exhaustive, highly condensed, and machine-parseable analysis of the core mechanics defining the most influential tabletop systems in the current market, decoding the mathematical resolution formulas, turn structures, and second-order strategic implications of these games.

## **Traditional D20 and Grid Architectures**

The architecture of a tabletop role-playing game is primarily defined by its core resolution mechanic—the mathematical formula used to arbitrate success or failure when a character attempts an action with an uncertain outcome. This mechanic fundamentally shapes the game's risk profile and narrative flow.

### **Dungeons and Dragons: 2024 Fifth Edition Revision**

Dungeons & Dragons remains the dominant force in the TTRPG market, enjoying near-ubiquitous brand penetration.3 Its 50th Anniversary Edition set new sales records, cementing its market dominance despite growing competition.2 The core engine relies on a unified twenty-sided die (d20) resolution mechanic, where players generate a random integer between 1 and 20, add a static modifier derived from one of six primary Ability Scores (ranging from ![][image1] for a score of 1, to ![][image2] for a score of 30), and compare the sum against a target Difficulty Class (DC).4

The 2024 revision of the Fifth Edition ruleset introduced significant modifications to the martial action economy, most notably through the implementation of the Weapon Mastery system.5 This system standardizes battlefield control effects that were previously restricted to specific class subclasses or spellcasters. By assigning mastery properties such as "Topple," "Push," "Sap," and "Cleave" to specific weapon types, the system dramatically increases the tactical options available to martial characters starting at level one.5

A critical second-order effect of this revision is observed in the "Nick" mastery property, which fundamentally alters the dual-wielding action economy. Under previous iterations, executing an attack with an off-hand light weapon required the expenditure of a Bonus Action. The Nick property allows this secondary attack to be executed as part of the primary Attack Action, completely freeing the character's Bonus Action for other tactical maneuvers.7 This creates complex cascading effects when combined with feats. For instance, stacking the Nick property with the Dual Wielder feat allows certain builds to execute up to four attacks across different weapon masteries at early levels, triggering multiple distinct saving throws and control effects simultaneously.8

Furthermore, interactions with movement and forced positioning demonstrate how minor tweaks to collision rules generate profound emergent gameplay strategies. The 2024 rules allow players to shove an ally into an enemy's space, which forces the creatures to end their turn in the same space, causing both (or the smaller creature) to fall prone without a saving throw.8 This "Allied Bowling Ball" maneuver represents a significant optimization of the action economy. Similarly, the "Buff Slap" technique utilizes the War Caster feat to cast a fully leveled buff spell, such as Haste or Polymorph, on an ally as an Opportunity Attack when that ally intentionally leaves the caster's reach, entirely bypassing the normal action cost of the spell.8

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Core Resolution | Unified d20 System | ![][image3] 4 |
| Action Economy | Discrete Resource Allowances | 1 Action, 1 Bonus Action, 1 Reaction, Movement per turn 9 |
| Weapon Mastery | Attribute-Linked Combat Effects | Specific properties (e.g., Nick, Topple) trigger upon hit 5 |
| Exploit Interactions | Allied Bowling Balls | Forced sharing of spatial squares resolves as immediate Prone condition 8 |

### **Pathfinder Second Edition**

Pathfinder Second Edition differentiates itself from its competitors by prioritizing a highly balanced, mathematically tight combat framework that explicitly rewards tactical synergy over individual character optimization.10 The system replaces the traditional action/bonus action dichotomy with a fluid "Three-Action Economy".11

During Encounter Mode, a participant's turn consists of exactly three actions and one reaction.11 Every capability in the game—from drawing a weapon to casting a spell—is costed against this universal budget. Spells typically cost two actions, striking costs one, and movement costs one.11 The psychological impact of this system is profound: because players have a pool of interchangeable actions, they are constantly weighing the opportunity cost of attacking versus positioning, aiding an ally, or raising a shield. To prevent players from simply spending all three actions on attacks, the system imposes a severe Multiple Attack Penalty (MAP) on consecutive strikes. This mathematically discourages static "full attacks" and encourages dynamic maneuvering.

The resolution system is further distinguished by its "Degrees of Success" engine.11 Unlike binary pass/fail systems, Pathfinder determines critical outcomes based on the margin of success. If a roll meets or exceeds the target DC, it is a success; if it exceeds the target DC by ![][image4] or more, it is a Critical Success.11 Conversely, failing by ![][image4] or more constitutes a Critical Failure.11 The second-order implication of this architecture is that flat numerical bonuses (such as a ![][image5] status bonus to hit) are exponentially more valuable than in standard d20 systems. A ![][image5] bonus does not merely increase the chance of hitting by 5%; it simultaneously increases the chance of a critical hit by 5% and decreases the chance of a critical failure by 5%, fundamentally shifting the entire probability bell curve. The strict mathematical bounding ensures that characters cannot trivially bypass encounters, forcing reliance on teamwork and debuff applications.

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Resolution | d20 with Degrees of Success | Critical Success if ![][image6] 11 |
| Critical Failure | Margin-Based Failure | Critical Failure if ![][image7] 11 |
| Action Economy | Universal Three-Action Pool | 3 Actions, 1 Reaction per turn; abilities cost 1-3 Actions 11 |
| Penalties | Multiple Attack Penalty (MAP) | Successive attacks suffer cumulative ![][image1] / ![][image8] penalties |

## **Percentile and Dice Pool Narrative Systems**

Departing from the additive mathematics of the d20 system, several prominent RPGs utilize roll-under percentile mechanics or dice pools. These systems directly expose the underlying probability to the player, allowing for transparent risk assessment and encouraging narrative-driven consequence management.

### **Call of Cthulhu Seventh Edition**

Call of Cthulhu utilizes a percentile (d100) roll-under system, inherently linking character competence directly to probability.13 A character with a Firearms skill of 65 simply has a 65% chance of success under normal conditions.14 This absolute transparency allows players to instantly intuitively grasp their risk profile.

To model varying degrees of difficulty, the Seventh Edition relies on success thresholds rather than modifying the target number. A Regular success requires rolling equal to or under the full skill value; a Hard success requires rolling under one-half the skill value; and an Extreme success requires rolling under one-fifth the skill value.15 In combat, this creates a highly lethal, comparative resolution matrix. Combat actions occur in descending order of the characters' Dexterity (DEX) values, with readied firearms granting a ![][image9] bonus to DEX for turn order determination.15

When attacked in close combat, a defender must choose to either "Dodge" or "Fight Back".15 If they fight back, they use their Fighting skill and must achieve a higher level of success (Regular, Hard, Extreme) than the attacker to avoid damage and inflict their own.15 Crucially, if the levels of success are equal, the tie goes to the initiator of the attack.15 If Dodging, the defender must similarly beat the attacker's success level, but ties are awarded to the dodger.15

Damage output scales violently with success levels. If a firearm or impaling weapon attack achieves an Extreme success, it inflicts maximum base weapon damage, plus maximum damage bonus, plus an additional roll of the weapon's damage dice.15 Situational advantages and disadvantages are managed via Bonus and Penalty dice.15 Instead of adding flat modifiers, the player rolls an additional "tens" digit die. For a Bonus die, the player selects the lower resulting tens digit; for a Penalty die, they must accept the higher digit.15 This directly manipulates the variance of the d100 roll without breaking the fundamental mathematical bounds of the skill score.

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Resolution | d100 Roll-Under | Success if ![][image10] 13 |
| Thresholds | Graduated Difficulty | Hard \= ![][image11]; Extreme \= ![][image11] 15 |
| Turn Order | DEX Sequencing | Base DEX; Readied Firearms \= ![][image12] 15 |
| Probability Modifier | Bonus/Penalty Dice | Roll multiple tens dice; take lowest for Bonus, highest for Penalty 15 |
| Extreme Damage | Impaling Weapons | ![][image13] 15 |

### **Blades in the Dark**

Blades in the Dark epitomizes the "fiction-first" design philosophy, utilizing a localized, player-facing dice pool system.18 The core mechanic involves assembling a pool of six-sided dice (d6) based on character attributes and taking the single highest result. A roll of ![][image14] represents full success; multiple ![][image15] represent a critical success; ![][image16] or ![][image17] represents a partial success with consequences; and ![][image18] through ![][image19] indicates failure with severe complications.18

The genius of this system lies in the GM-arbitrated Position and Effect matrix.18 Before the dice are rolled, the GM explicitly establishes the Position (Controlled, Risky, or Desperate)—which dictates the severity of potential consequences—and the Effect (Limited, Standard, or Great)—which determines the narrative impact of the success.18 This forces a transparent negotiation of risk before the physical mechanic is engaged.

Consequences are categorized into five types: Reduced Effect, Complication (ticking adverse clocks), Lost Opportunity, Worse Position, and Harm.18 Harm is tracked in a graduated three-tier system; Level 1 applies reduced effect, Level 2 subtracts 1d from rolls, and Level 3 incapacitates the character.18 A fourth level of harm represents fatal or permanent catastrophic consequences.18 Players can mitigate these consequences through Resistance rolls, which allow a player to reduce or avoid a consequence by suffering "Stress." The Stress cost is calculated mathematically as ![][image20], ensuring that resisting consequences always carries an unpredictable resource drain.18 Accumulating maximum stress results in permanent Trauma.18

Furthermore, the game's turn structure completely bypasses the traditional planning phase of tabletop heists through the "Engagement Roll" and "Flashback" mechanics.18 Players bypass hours of speculative planning by selecting a single approach (Assault, Deception, Stealth, Occult, Social, Transport), rolling a fortune roll to determine their starting position (Controlled, Risky, or Desperate), and spending Stress to trigger Flashbacks that retroactively establish preparations during the heist.18 Flashbacks cost 0 stress for simple actions, 1 stress for complex actions, and 2 or more stress for highly elaborate contingencies.18 This drastically compresses the action economy of the narrative, maximizing actual gameplay engagement by confining play strictly to the execution phase. The game loop then transitions to a Downtime phase, where players resolve Payoff, manage Heat (wanted level), resolve Entanglements, and perform specific activities like indulging their vice to clear Stress.18

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Resolution | d6 Pool (Take Highest) | Critical \= multiple 6s; Success \= 6; Partial \= 4-5; Fail \= 1-3 18 |
| Negotiation Matrix | Position and Effect | Position defines risk; Effect defines impact magnitude 18 |
| Consequence Mitigation | Stress and Resistance | ![][image21] 18 |
| Narrative Pacing | Score and Downtime | Phased transition from Free Play ![][image22] Score ![][image22] Downtime Activities 18 |
| Temporal Manipulation | Flashbacks | Retroactive preparation costs 0, 1, or 2+ Stress based on complexity 18 |

## **High-Lethality Cybernetic Frameworks**

### **Cyberpunk RED**

Operating on the Interlock System, Cyberpunk RED balances cinematic narrative with punishing, gritty realism through its "Thursday Night Throwdown" combat framework.20 This framework is designed to be a streamlined successor to the famously complex "Friday Night Firefight" system used in Cyberpunk 2020\.20 The core resolution formula requires rolling a ten-sided die (d10) and adding a character's Statistic and Skill rank, comparing the total against a Difficulty Value (DV).20 A roll of ![][image4] triggers an exploding critical success, while a roll of ![][image18] triggers a critical failure and a corresponding fumble roll.20

Lethality is the defining characteristic of this ruleset. Unlike prior editions that utilized a complex Wound Damage Table, RED transitioned to a more familiar Hit Point system derived from the Body statistic.20 However, armor degradation ensures combat remains highly attritional. When an attack penetrates a target's Stopping Power (SP), the armor is ablated and the SP is permanently reduced by 1 point, making subsequent attacks progressively more lethal.21

The mathematics of damage application vary significantly based on the type of attack. Area-of-effect weapons, such as grenades and rockets, only apply armor ablation and damage to the body location; they cannot be utilized for aimed shots.21 Conversely, aimed shots can target specific locations (like the head). When an aimed shot to the head successfully penetrates armor, the damage that gets through the SP is multiplied by two.21

The game features complex interactions between role abilities and combat maneuvers. For example, the Solo role possesses a "Spot Weakness" ability that adds a flat damage bonus. When calculating damage for an Autofire attack, the damage is multiplied by the amount the attack roll exceeded the Autofire DV (up to the weapon's maximum limit), and the Spot Weakness bonus is added *after* the multiplication but *before* subtracting the armor's SP.21 This creates a mathematical priority system that rewards players who systematically break down opponent defenses through specific weapon combinations and precise targeting algorithms.

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Resolution | Interlock System | ![][image23] 20 |
| Defenses | Stopping Power (SP) | Damage penetrating SP reduces armor rating permanently 21 |
| Targeted Strikes | Aimed Shot (Head) | ![][image24] 21 |
| Automatic Weapons | Autofire Calculation | ![][image25] 21 |

## **Heavy Simulation Wargaming**

Miniature wargames abstract the complexities of mass combat into spatial puzzles governed by strict phase-based sequencing and probability matrices. The primary friction in these systems derives from the interplay between movement distances, line of sight, and the mathematical attrition of unit profiles.

### **Warhammer 40,000 Tenth Edition**

The tenth edition of Warhammer 40,000 mandates a rigid five-phase turn sequence: Command, Movement, Shooting, Charge, and Fight.22 The Command phase handles macro-resource generation (Command Points) and morale via Battle-shock tests.23 If a unit has been reduced to below half-strength (fewer than half its starting models or wounds), it must roll ![][image26]; if the sum is less than the unit's Leadership characteristic, the unit becomes "Battle-Shocked".23 A Battle-Shocked unit loses its ability to control objective markers and cannot be the target of helpful stratagems until its next Command phase.23

The combat sequence is a standardized, four-step attritional filter 23:

1. **Hit Roll:** A d6 is rolled against the attacking model's Ballistic Skill (ranged) or Weapon Skill (melee). Unmodified ![][image15] are defined as "Critical Hits" and always succeed automatically.23  
2. **Wound Roll:** The Strength (S) of the attacking weapon is compared against the Toughness (T) of the target. If ![][image27], it wounds on a ![][image28]; if ![][image29], on a ![][image30]; if ![][image31], on a ![][image32]; if ![][image33], on a ![][image34]; and if ![][image35], on a ![][image36].23 Unmodified ![][image15] are "Critical Wounds" and automatically succeed.23  
3. **Saving Throw:** The target player allocates the wound and rolls a d6, subtracting the weapon's Armour Penetration (AP) modifier. The modified result must meet or exceed the model's Save characteristic.23  
4. **Damage Allocation:** Unsaved wounds inflict damage equal to the weapon's Damage (D) characteristic. Excess damage from a single attack past what is needed to reduce a model to 0 wounds is entirely lost; it does not spill over to other models in the unit.23 This mathematical reality forces players to carefully align weapon damage profiles with appropriate targets to avoid massive inefficiencies.

Engagement geometry is strictly enforced. Units cannot be moved within 1" horizontally or 5" vertically of enemy models during the Movement phase; contact can only be initiated by declaring a Charge.22 During the Fight phase, combats are resolved sequentially. Units that successfully charged gain the "Fights First" ability.23 Following this, players alternate selecting eligible units to fight, crucially starting with the player whose turn it is *not*.23 When selected, a unit may Pile In up to 3", execute its melee attacks, and then Consolidate up to 3" to tie up further enemy elements.23 This alternating activation within the melee phase adds a deep layer of counter-punches and prioritization to close-quarters encounters.

| Phase / Mechanism | Implementation Detail | Mathematical / Spatial Requirement |
| :---- | :---- | :---- |
| Command | Battle-shock Test | Pass if ![][image37] for units below 50% strength 23 |
| Movement | Distance Constraints | Cannot end move within 1" horizontal / 5" vertical of enemy 23 |
| Combat Loop | Hit ![][image22] Wound ![][image22] Save | Strength vs Toughness comparison matrix dictates ![][image28] to ![][image36] requirement 23 |
| Melee Sequencing | Alternating Activations | Non-active player selects first unit to fight in the standard step 23 |

### **Warhammer Age of Sigmar Fourth Edition**

While sharing a genetic lineage with Warhammer 40,000, Age of Sigmar Fourth Edition diverges by prioritizing a seven-phase turn structure and embedding interaction directly into the opponent's turn. The battle round begins with a roll-off to determine the active player, with the player who finished deployment first winning priority ties on the first round.25

The active player progresses through the phases, but uniquely, in each phase, the active player resolves all their abilities first, followed immediately by the opponent using their reactive abilities for that specific phase.9 This structural design actively prevents the passive downtime inherent in pure "I-Go-You-Go" systems. The Fight phase specifically requires players to alternate selecting units to use a Fight ability, starting with the active player.9 Every unit must use a Fight ability if it is legally able to do so.9

A critical mechanical nuance introduced in the Fourth Edition involves Faction Terrain.26 Unlike standard obstacles or scenery, Faction Terrain only possesses a combat range during the Charge and Combat phases.26 The second-order implication of this rule is profound: models can maneuver intimately close to enemy monuments during the Movement phase without triggering engagement penalties. However, they transition into active combatants the moment the Charge phase initiates.26 This drastically alters spatial zoning, allowing players to utilize creative maneuvering to extend or guarantee charges onto objectives, or swing around terrain features to bypass screens, generating completely new counter-charge geometries.26

| Mechanism Parameter | Implementation Detail | Operational Sequence |
| :---- | :---- | :---- |
| Turn Structure | 7 Phases per Turn | Active player resolves abilities ![][image22] Opponent resolves reactive abilities 9 |
| Combat Resolution | Alternating Activations | Players alternate picking units to fight, starting with the active player 9 |
| Faction Terrain | Dynamic Combat Range | Terrain exerts 3" combat range solely during Charge/Combat phases 26 |

### **BattleTech: A Game of Armored Combat**

BattleTech represents the zenith of granular, deterministic simulationism. The game eschews abstract unit health in favor of tracking complex locational damage, internal heat generation, and detailed movement vectors via hex-based maps.27

The core resolution relies on a 2d6 roll-over mechanic.28 The required target number is not static; it is calculated cumulatively based on the formula: ![][image38].28 For instance, an attacking mech walking adds ![][image5] to its own target number, running adds ![][image39], and jumping adds ![][image40].27 Conversely, a target moving rapidly across the hex grid accrues high evasion modifiers. This creates a rigorous mathematical optimization puzzle where players must plot their movement vectors to maximize enemy target numbers while minimizing their own firing penalties.

A defining characteristic of BattleTech is the order of attack resolution. Unlike most modern games where attacks are resolved sequentially, BattleTech enforces a phase of simultaneous damage resolution.30 Players sequentially declare all weapon attacks across the entire board before any dice are rolled.30 The second-order effect of this design is profound information asymmetry: the player who lost the initiative roll must declare their attacks first, allowing the initiative winner to optimize their firing patterns and heat generation based on perfect knowledge of the opponent's intentions.30 Once all attacks are declared, the dice are rolled, and damage is applied simultaneously at the end of the phase. A mech that is technically destroyed early in the sequence still gets to resolve its declared attacks.30

Weapons generate heat, and managing the heat scale is critical to operational efficiency. The accumulation of excess heat degrades movement capabilities, penalizes firing accuracy, and, if pushed to extremes, can trigger catastrophic internal ammunition explosions or force the mech to automatically shut down.28 Players must constantly balance the desire for maximum damage output ("Alpha Striking") against the severe mathematical penalties of overheating.

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Core Resolution | 2d6 Target Number | ![][image41] 28 |
| Turn Structure | Simultaneous Resolution | Sequential declaration (loser first) ![][image22] simultaneous damage application 30 |
| Resource Management | Heat Scale Tracking | Cumulative heat reduces speed and increases attack difficulty modifiers 27 |

### **OnePageRules: Grimdark Future**

In direct response to the rule bloat and extensive cognitive load of traditional wargames, *Grimdark Future* by OnePageRules implements a hyper-compressed, alternating activation framework.33 The system abandons multi-step Hit/Wound/Save comparison charts in favor of two universal unit statistics: Quality (Qua) and Defense (Def).34 When attacking, a player simply rolls a d6 for each attack, aiming to meet or exceed their unit's Quality rating. The defending player then rolls a d6 for each successful hit, aiming to meet or exceed their Defense rating to negate the damage.34

The strategic depth emerges not from complex math, but from the alternating activation sequence. Players take turns activating a single unit at a time to move, shoot, or charge.34 Because a unit can only be activated once per round (receiving a maximum of four activations per standard game), committing a vital unit early leaves it vulnerable to counter-attacks. This creates a chess-like prioritization of battlefield assets.34

Morale is seamlessly integrated into the combat resolution. Taking excessive damage triggers an immediate Quality test. Failing this test results in a unit becoming "Pinned"—which strips its ability to contest objectives and forces it to lose its next activation in combat—or, if the unit's strength is sufficiently depleted, entirely "Routed" and removed from the board.34 This design proves that extreme mechanical minimalism can still yield deep strategic matrices by shifting the complexity from mathematical calculations to spatial and temporal activation sequencing.34

| Mechanism Parameter | Implementation Detail | Mathematical Formula / Condition |
| :---- | :---- | :---- |
| Resolution | Qua/Def Thresholds | Attack Success: ![][image42]; Save Success: ![][image43] 34 |
| Action Sequencing | Alternating Activations | Players activate one unit at a time; 4 total rounds per game 34 |
| Morale Status | Pinned and Routed | Failed Quality tests strip objective control and activation economy 34 |

## **Deterministic AI and Cooperative Algorithmic Engines**

While RPGs rely on a Game Master for arbitration and wargames pit players symmetrically against one another, complex cooperative board games encode their resistance natively into the ruleset via deterministic algorithms or high-friction resource economies.

### **Gloomhaven**

Gloomhaven operates entirely via an autonomous, deterministic artificial intelligence system governing monster behavior.35 The game eliminates the need for a human antagonist by strictly scripting enemy movement and targeting priorities through a deck of AI ability cards.

The AI algorithm resolves in a strict, unyielding hierarchy:

1. **Determine Focus:** The monster identifies the enemy that requires the absolute minimum number of movement hexes to execute an attack.37 If the monster possesses no attack capability on its drawn ability card (or is disarmed), it calculates focus as if performing a generic single-target melee attack.37 Crucially, when determining this path, the AI assumes it possesses infinite movement to locate the optimal route.38  
2. **Tie-Breakers:** If multiple targets require the exact same movement expenditure to reach, the monster targets the enemy that is closest "as the crow flies" (proximity), ignoring terrain.38 If a tie persists after proximity, the monster targets the enemy acting earliest in the current round's initiative order.38  
3. **Optimize Movement:** Once the focus is locked, the monster pathfinds. It will move to maximize the efficiency of its attack. The AI is programmed to treat traps and hazardous terrain as impassable obstacles *unless* absolutely no other path to a valid target exists.38 If forced to cross hazards, it will calculate the route that incurs the least number of negative hexes.38

This deterministic architecture allows players to calculate exact enemy vectors. By carefully adjusting their initiative values and standing directly adjacent to hazardous terrain, players can manipulate the AI logic, forcing enemies to take sub-optimal routes, trigger traps, or group together for devastating area-of-effect abilities. The AI's inability to dynamically "think" beyond its rigid targeting parameters forms the core spatial puzzle of the game.

| AI Logic Step | Deterministic Action | Secondary Condition |
| :---- | :---- | :---- |
| 1\. Focus Selection | Target enemy requiring least movement | Assumes infinite movement to locate path 38 |
| 2\. Tie-Breaking | Proximity (Line of Sight) | Resolves to Initiative order if proximity is tied 38 |
| 3\. Movement Execution | Traverse grid to attack hex | Only enters traps if zero alternative paths exist 38 |

### **Spirit Island**

Spirit Island tasks players with defending an island from autonomous Invaders. The game handles extreme complexity by enforcing simultaneous action selection and dividing player agency into strict temporal phases.39

The engine building is governed by the Spirit Panels, which feature two primary Presence Tracks determining Energy Income and Card Plays per turn.39 During the Spirit Phase's "Grow" step, players add Presence tokens from these tracks onto the board, slowly unveiling higher income and card play limits.39 Players only gain the benefits of the highest uncovered number on each track.39 This forces a strict economic decision: players must choose between generating enough energy to afford high-cost major powers, or unlocking the ability to play multiple low-cost minor powers simultaneously.

The combat loop is structured around a temporal puzzle: Fast Powers versus Slow Powers. During the Spirit Phase, players select and pay the energy cost for all their cards upfront, regardless of speed.39 Fast Powers resolve immediately after the Spirit Phase, allowing spirits to preemptively destroy or move Invaders before they act. The Invaders then execute an entirely predictable algorithm of Ravaging (damaging the land and native Dahan), Building (creating new settlements), and Exploring (adding new units based on card draws).40

Finally, Slow Powers resolve. The psychological burden here is significant: Slow Powers must be drafted and paid for before the board state changes. This requires players to accurately project the board geometry post-Invader phase and target locations where enemies *will* be, rather than where they currently are. Furthermore, cards played grant temporary elemental affinities (e.g., Fire, Water) that dissipate at the end of the turn.39 Reaching specific elemental thresholds triggers powerful innate Spirit abilities, rewarding players who carefully draft synergistic cards over those with raw individual utility.39

| Phase / Mechanism | Action Parameter | Strategic Implication |
| :---- | :---- | :---- |
| Spirit Phase | Growth & Presence Drafting | Unlocks Energy vs. Card Play economy; cards paid upfront 39 |
| Fast Powers | Pre-Invader Resolution | Mitigates immediate threats before enemy phase |
| Invader Phase | Explore ![][image22] Build ![][image22] Ravage | Predictable AI algorithmic escalation 40 |
| Slow Powers | Post-Invader Resolution | Requires predictive targeting based on altered board state |

## **Economic Tableau and Asymmetric Conflict Engines**

### **Terraforming Mars**

Terraforming Mars is a quintessential resource-management and tableau-building engine where players act as corporations altering global parameters. The game loop is segmented into "Generations," representing the passage of time, each consisting of Research, Action, and Production phases.42

During the Research Phase, players draw four project cards, forcing a strict economic decision: they must spend 3 Megacredits for each card they wish to keep, draining resources before they even pay the actual play cost.43 The Action Phase allows players to take one or two actions per turn, continuing clockwise around the table until all players pass.43

The seven standard actions available during this phase include: playing a project card from hand, executing a standard project (six options printed on the board, such as funding an aquifer or an asteroid impact), claiming a milestone (only three of five can be claimed per game), backing an award, using a blue card's action, converting 8 plants into a greenery tile, or converting 8 heat into a global temperature increase.43

The mechanical friction stems from the decoupling of immediate resources from long-term production. A player might possess vast reserves of titanium but have a production rate of zero.44 Cards contain intricate tag prerequisites; a high-yield building card might require a specific oxygen threshold to be played, or demand a sacrifice in plant production to represent environmental destruction.43 The global parameters (Temperature, Oxygen, Oceans) serve as both the game's clock and a shared prerequisite board.44 As parameters cap out, the avenues for scoring Terraforming Rating (TR) points narrow, forcing players to pivot their carefully constructed engines from raw terraforming to point generation via cities and milestones.

| Generation Phase | Implementation Detail | Economic Implication |
| :---- | :---- | :---- |
| Research Phase | Draft and Purchase Cards | Costs 3 Megacredits per card retained 43 |
| Action Phase | 1-2 Actions per Turn | Players utilize 7 standard actions or card abilities 43 |
| Production Phase | Resource Generation | Convert energy to heat; produce yields based on tracked metrics 43 |

### **Root**

Root explores extreme factional asymmetry. While all players share the same map, the same victory condition (reaching 30 points), and the same combat mechanics, the fundamental rules governing how each faction interacts with the economy and action space are entirely distinct.47

The shared mechanics rely on the "Rule of Move" and a 2d12 combat resolution. To move, a player must rule either the origin clearing, the destination clearing, or both (determined by having the highest combined total of warriors and buildings present).47 When a battle is initiated, two custom twelve-sided dice (numbered 0 to 3\) are rolled. The attacker inflicts hits equal to the higher roll, while the defender inflicts hits equal to the lower roll.47 Hits are capped by the number of warriors present; however, if a defender has zero warriors in a clearing, they are deemed "Defenseless" and automatically suffer an extra hit.47 Additionally, before dice are rolled, a defender may play an Ambush card matching the clearing suit to deal two immediate hits, which can only be canceled if the attacker plays a matching Ambush card.47

The asymmetry is encoded in the phase sequencing (Birdsong, Daylight, Evening) of each faction:

* **The Marquise de Cat** operates as a traditional action-point economy. During Birdsong, they place wood tokens at sawmills. During Daylight, they craft, then take up to three actions (Battle, March, Recruit, Build) to establish logistical supply lines.47  
* **The Eyrie Dynasties** utilize a programmatic "Decree." During Birdsong, they must add one or two cards to their Decree sequence. During Daylight, they must resolve every card sequentially matching the clearing suits (Recruit, Move, Battle, Build). If they fail to execute even a single action, they fall into "Turmoil," losing victory points and resetting their entire engine.47  
* **The Woodland Alliance** operates a guerilla insurgency. During Birdsong, they resolve revolts and spread sympathy tokens. During Daylight, they craft and mobilize supporters. During Evening, they conduct military operations based on their trained officer count.47  
* **The Vagabond** controls only a single pawn, uniquely ignoring the Rule of Move. Instead of warriors, they manage an inventory of items. During Daylight, they exhaust these items to take actions (moving, battling, questing), and during Evening, they rest to repair and refresh them.47  
* **The Riverfolk Company** operates an open-market economy. During Evening, they set prices for services (river travel, mercenaries, drawing cards). During Daylight, they commit or spend "Funds" (the warriors of other players used as currency) to execute actions. Crucially, they must keep their hand of cards public to facilitate trade.47

| Faction | Action Engine Model | Primary Constraints & Vulnerabilities |
| :---- | :---- | :---- |
| Marquise de Cat | Action-Point Resource Logistics | Requires secure supply lines to utilize wood tokens 47 |
| Eyrie Dynasties | Programmatic Decree Resolution | Highly susceptible to disruption causing Turmoil state 47 |
| Woodland Alliance | Insurgency & Token Spreading | Relies on opponent overreach to trigger revolts 47 |
| Vagabond | Single-Unit Item Exhaustion | Item damage directly limits available action capability 47 |
| Riverfolk | Open Market & Funds Allocation | Entirely dependent on pricing services to opponents 47 |

## **Conclusion**

The contemporary tabletop gaming sector is defined by a rapid diversification of mechanical systems designed to balance tactical depth with cognitive efficiency. By leveraging streamlined dice mechanics—such as the unified d20 system, the Interlock d10 framework, or the risk-adjusted d6 pools of Forged in the Dark systems—designers have successfully reduced the friction of action resolution while increasing the narrative or tactical stakes. Concurrently, the proliferation of rigid temporal structures, whether it be the Fast/Slow power dichotomy of Spirit Island, the strict five-phase sequencing of Warhammer 40,000, or the highly precarious action programming of Root's Eyrie Dynasties, ensures that games remain intensely cerebral. The evolution of ludological design clearly points toward further extreme asymmetry and the continued integration of deterministic AI systems, blending the narrative freedom of traditional role-playing with the rigorous mathematical engines of heavy strategy games.

#### **Works cited**

1. Board Game Popularity Statistics (2024–2025), accessed February 24, 2026, [https://coopboardgames.com/statistics/board-game-popularity-statistics/](https://coopboardgames.com/statistics/board-game-popularity-statistics/)  
2. Worldwide TTRPG Market in 2024 – Industry Analysis, accessed February 24, 2026, [https://www.rpgdrop.com/worldwide-ttrpg-market-in-2024-industry-analysis/](https://www.rpgdrop.com/worldwide-ttrpg-market-in-2024-industry-analysis/)  
3. Does anyone have any data/vibes on what the most popular ttrpgs are right now? : r/rpg, accessed February 24, 2026, [https://www.reddit.com/r/rpg/comments/1m8cbk7/does\_anyone\_have\_any\_datavibes\_on\_what\_the\_most/](https://www.reddit.com/r/rpg/comments/1m8cbk7/does_anyone_have_any_datavibes_on_what_the_most/)  
4. 5e SRD \- Mechanics \- GM Binder, accessed February 24, 2026, [https://www.gmbinder.com/share/-LPcHTX5TthJ-D71HHXG](https://www.gmbinder.com/share/-LPcHTX5TthJ-D71HHXG)  
5. Weapon Mastery in D\&D 2024 \- Roll20, accessed February 24, 2026, [https://pages.roll20.net/dnd/2024-weapon-mastery](https://pages.roll20.net/dnd/2024-weapon-mastery)  
6. 2024 D\&D WEAPON MASTERY BREAKDOWN \- RPGBOT.Podcast S4E89 \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=z7CsVoUfn8w](https://www.youtube.com/watch?v=z7CsVoUfn8w)  
7. Your Guide to Weapon Mastery in the 2024 Player's Handbook \- D\&D Beyond, accessed February 24, 2026, [https://www.dndbeyond.com/posts/1742-your-guide-to-weapon-mastery-in-the-2024-players](https://www.dndbeyond.com/posts/1742-your-guide-to-weapon-mastery-in-the-2024-players)  
8. Summary of D\&D 2024 Rules Issues (Do we really accept this shoddy writing?) \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/onednd/comments/1esn66h/summary\_of\_dd\_2024\_rules\_issues\_do\_we\_really/](https://www.reddit.com/r/onednd/comments/1esn66h/summary_of_dd_2024_rules_issues_do_we_really/)  
9. Warhammer Age of Sigmar \- Warhammer Community, accessed February 24, 2026, [https://assets.warhammer-community.com/ageofsigmar\_corerules\&keydownloads\_therules\_eng\_24.09-tbf4egjql3.pdf](https://assets.warhammer-community.com/ageofsigmar_corerules&keydownloads_therules_eng_24.09-tbf4egjql3.pdf)  
10. The Core of PF2e Design. And why this is my system of choice. : r/Pathfinder2e \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/Pathfinder2e/comments/1o7fvbw/the\_core\_of\_pf2e\_design\_and\_why\_this\_is\_my\_system/](https://www.reddit.com/r/Pathfinder2e/comments/1o7fvbw/the_core_of_pf2e_design_and_why_this_is_my_system/)  
11. Chapter 9: Playing the Game \- Rules \- Archives of Nethys ..., accessed February 24, 2026, [https://2e.aonprd.com/Rules.aspx?ID=311](https://2e.aonprd.com/Rules.aspx?ID=311)  
12. Pathfinder 2e Explained: A Comprehensive Summary \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=5H0HuXIqb2I](https://www.youtube.com/watch?v=5H0HuXIqb2I)  
13. Call of Cthulhu 7th Edition \- Mechanics Are Easy \- WordPress.com, accessed February 24, 2026, [https://texarkana23.wordpress.com/tag/call-of-cthulhu-7th-edition/](https://texarkana23.wordpress.com/tag/call-of-cthulhu-7th-edition/)  
14. System Rules: Call of Cthulhu 7th \- TRPGLine, accessed February 24, 2026, [https://trpgline.com/rules/coc7/summary](https://trpgline.com/rules/coc7/summary)  
15. Combat | The Call of Cthulhu RPG Wiki, accessed February 24, 2026, [https://cthulhuwiki.chaosium.com/rules/combat.html](https://cthulhuwiki.chaosium.com/rules/combat.html)  
16. Explain to me the combat system like I'm five. : r/callofcthulhu \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/callofcthulhu/comments/1773ujg/explain\_to\_me\_the\_combat\_system\_like\_im\_five/](https://www.reddit.com/r/callofcthulhu/comments/1773ujg/explain_to_me_the_combat_system_like_im_five/)  
17. Combat \- How to Play Call of Cthulhu 7E (Tabletop RPG) \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=X\_5o5I0-gfc](https://www.youtube.com/watch?v=X_5o5I0-gfc)  
18. The Core System | Blades in the Dark RPG, accessed February 24, 2026, [https://bladesinthedark.com/core-system](https://bladesinthedark.com/core-system)  
19. blades-in-the-dark-srd-content/Blades-in-the-Dark-SRD.md at main \- GitHub, accessed February 24, 2026, [https://github.com/amazingrando/blades-in-the-dark-srd-content/blob/main/Blades-in-the-Dark-SRD.md](https://github.com/amazingrando/blades-in-the-dark-srd-content/blob/main/Blades-in-the-Dark-SRD.md)  
20. Interlock System | Cyberpunk Wiki | Fandom, accessed February 24, 2026, [https://cyberpunk.fandom.com/wiki/Interlock\_System](https://cyberpunk.fandom.com/wiki/Interlock_System)  
21. cyberpunk red FAQ \- R. Talsorian Games, accessed February 24, 2026, [https://rtalsoriangames.com/wp-content/uploads/2021/07/RTG-CPR-CoreBookFAQv1.3.pdf](https://rtalsoriangames.com/wp-content/uploads/2021/07/RTG-CPR-CoreBookFAQv1.3.pdf)  
22. Core Rules \- Warhammer Community, accessed February 24, 2026, [https://assets.warhammer-community.com/warhammer40000\_core\&key\_corerules\_eng\_24.09-5xfayxjekm.pdf](https://assets.warhammer-community.com/warhammer40000_core&key_corerules_eng_24.09-5xfayxjekm.pdf)  
23. How To Play: The Warhammer 40K Turn Sequence \- Bell of Lost Souls, accessed February 24, 2026, [https://www.belloflostsouls.net/2023/06/how-to-play-the-warhammer-40k-turn-sequence.html](https://www.belloflostsouls.net/2023/06/how-to-play-the-warhammer-40k-turn-sequence.html)  
24. Warhammer 40K 10th Edition Cheat Sheet \- Scribd, accessed February 24, 2026, [https://www.scribd.com/document/719069019/10th-Edition-Cheat-Sheet-Revision-5-1](https://www.scribd.com/document/719069019/10th-Edition-Cheat-Sheet-Revision-5-1)  
25. Analysis of key points from the 4th Edition rules : r/ageofsigmar \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/ageofsigmar/comments/1dn7czm/analysis\_of\_key\_points\_from\_the\_4th\_edition\_rules/](https://www.reddit.com/r/ageofsigmar/comments/1dn7czm/analysis_of_key_points_from_the_4th_edition_rules/)  
26. Six Key Takeaways From AOS 4th Edition's Full Rules \- Plastic Craic, accessed February 24, 2026, [https://plasticcraic.blog/2024/06/24/six-key-takeaways-from-aos-4th-editions-full-rules/](https://plasticcraic.blog/2024/06/24/six-key-takeaways-from-aos-4th-editions-full-rules/)  
27. Cheat Sheets? : r/battletech \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/battletech/comments/un9avy/cheat\_sheets/](https://www.reddit.com/r/battletech/comments/un9avy/cheat_sheets/)  
28. Battletech Tabletop Basics: Turn Order | PDF | Teaching Methods & Materials \- Scribd, accessed February 24, 2026, [https://www.scribd.com/document/325212761/Battle-Tech-Basics](https://www.scribd.com/document/325212761/Battle-Tech-Basics)  
29. accessed December 31, 1969, [https://bg.battletech.com/wp-content/uploads/2020/08/BattleTech-AGoAC-Reference-Card.pdf](https://bg.battletech.com/wp-content/uploads/2020/08/BattleTech-AGoAC-Reference-Card.pdf)  
30. Boardgame: what's the order of attack resolution? : r/battletech \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/battletech/comments/rd2x0o/boardgame\_whats\_the\_order\_of\_attack\_resolution/](https://www.reddit.com/r/battletech/comments/rd2x0o/boardgame_whats_the_order_of_attack_resolution/)  
31. House rules for simpler games? : r/battletech \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/battletech/comments/1ddnlhy/house\_rules\_for\_simpler\_games/](https://www.reddit.com/r/battletech/comments/1ddnlhy/house_rules_for_simpler_games/)  
32. Simplified BattleTech / RPG Conversion / MechWarrior Video Game Feel \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/battletech/comments/wwal35/simplified\_battletech\_rpg\_conversion\_mechwarrior/](https://www.reddit.com/r/battletech/comments/wwal35/simplified_battletech_rpg_conversion_mechwarrior/)  
33. My thoughts on the Grimdark 3.5 Beta rules/changes (warning, lots of words....) \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/onepagerules/comments/1n69shf/my\_thoughts\_on\_the\_grimdark\_35\_beta\_ruleschanges/](https://www.reddit.com/r/onepagerules/comments/1n69shf/my_thoughts_on_the_grimdark_35_beta_ruleschanges/)  
34. Grimdark Future Strategy \- OPR Community Wiki, accessed February 24, 2026, [https://wiki.onepagerules.com/index.php/Grimdark\_Future\_Strategy](https://wiki.onepagerules.com/index.php/Grimdark_Future_Strategy)  
35. Gloomhaven Monster AI \- The Basics \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=7Z6\_5HUD2oU](https://www.youtube.com/watch?v=7Z6_5HUD2oU)  
36. Gloomhaven \- How-to-Play \- Monster's Turn \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=CAkrLz10KZo](https://www.youtube.com/watch?v=CAkrLz10KZo)  
37. Monster AI \- Trying to Simplify : r/Gloomhaven \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/Gloomhaven/comments/fxn2s8/monster\_ai\_trying\_to\_simplify/](https://www.reddit.com/r/Gloomhaven/comments/fxn2s8/monster_ai_trying_to_simplify/)  
38. Best Resources on understanding monster focus? : r/Gloomhaven \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/Gloomhaven/comments/10lij7d/best\_resources\_on\_understanding\_monster\_focus/](https://www.reddit.com/r/Gloomhaven/comments/10lij7d/best_resources_on_understanding_monster_focus/)  
39. Spirit \- Spirit Island Wiki, accessed February 24, 2026, [https://spiritislandwiki.com/index.php?title=Spirit](https://spiritislandwiki.com/index.php?title=Spirit)  
40. Spirit Island Rulebook \- 1jour-1jeu.com, accessed February 24, 2026, [https://cdn.1j1ju.com/medias/87/39/54-spirit-island-rulebook.pdf](https://cdn.1j1ju.com/medias/87/39/54-spirit-island-rulebook.pdf)  
41. Summary of Action rules \- Querki, accessed February 24, 2026, [https://querki.net/raw/darker/spirit-island-faq/Summary-of-Action-rules](https://querki.net/raw/darker/spirit-island-faq/Summary-of-Action-rules)  
42. Terraforming mars Rulebook, accessed February 24, 2026, [https://cdn.1j1ju.com/medias/13/3f/fb-terraforming-mars-rule.pdf](https://cdn.1j1ju.com/medias/13/3f/fb-terraforming-mars-rule.pdf)  
43. How to Play Terraforming Mars: A Step-by-Step Guide – sleevekings, accessed February 24, 2026, [https://sleevekings.com/blogs/news/how-to-play-terraforming-mars-a-step-by-step-guide](https://sleevekings.com/blogs/news/how-to-play-terraforming-mars-a-step-by-step-guide)  
44. Terraforming Mars \- How To Play \- YouTube, accessed February 24, 2026, [https://www.youtube.com/watch?v=n3yVpsiVwL8](https://www.youtube.com/watch?v=n3yVpsiVwL8)  
45. Terraforming Mars explanation help : r/boardgames \- Reddit, accessed February 24, 2026, [https://www.reddit.com/r/boardgames/comments/asa4qh/terraforming\_mars\_explanation\_help/](https://www.reddit.com/r/boardgames/comments/asa4qh/terraforming_mars_explanation_help/)  
46. The Complete Terraforming Mars Buyer's Guide \- Geeks Under Grace, accessed February 24, 2026, [https://www.geeksundergrace.com/tabletop/the-complete-terraforming-mars-buyers-guide/](https://www.geeksundergrace.com/tabletop/the-complete-terraforming-mars-buyers-guide/)  
47. The Law of Root: A Woodland Game of Might and Right, accessed February 24, 2026, [http://root.livingrules.io/](http://root.livingrules.io/)  
48. root rules.pdf, accessed February 24, 2026, [http://boardgame.bg/root%20rules.pdf](http://boardgame.bg/root%20rules.pdf)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAUCAYAAACJfM0wAAAAVElEQVR4XmNgGAVDAfyHYnQxigHMYHRMMaCKIdjA0DWYquELAtgMQhFDj1V8mBAgRg1ZgGKDcfkCnU8ywGYoCGATIxmgG4LLMrIAqZFLMqCJofQBAJQILdPGrI8RAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAAAjklEQVR4Xu3O0QqEMAxEUf//p5WAKUbmJm3BJ3OgDzsz23ocrf3UeZ+Mb2a2y2Yvzzq086fsQ6hTWVAOBHrMUKeyoBwI9JihTmVBORDoMUMd5UNaguxS6kLuP1aOstNRPqQlyC6lTmVBORDoMUOdyoJyINBjTnUqC8rBg3/A+yieZ5tgarRp6e6lcWtfuwAYdVult+bonAAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWcAAAAWCAYAAAAcsV1dAAADGElEQVR4Xu2Y4YrkMAyD9/1f+o78MBghOW6btumuPig0suQ4M9mBu58fY4wxxhhjjDHGGGOMMeY+/hXPLuw40wp2/byPcPQMR/0zVvVb0cOYW8BLuerSr2KXORRnZ8Nz4ede9e36nqAzw13zVv2Unsl55q/6G3M76vLtcjHVHEp/gtj7ygzVD0PVu6s9hZozU53nCqqn0pHsQ/9dMxvTorp4u1xMNcPu81Xg7LjO2sw3UHqHs7lBZKv9O54zXO13Nf8kX5nTLKT60ne5vGoGpT/NmTnws8V11ma+gdI7nM0NIlvtn8+hPGe42u9q/km+MqdZiPrSq4vb+WOr6qrGtEHWcG+VeZLO/jhvZ27mw3Wg9A5nc4PIqv1n9Uw+L/NinfmUjmAP9Cs908nnd/Qc4UrWfBB1YZQ+UHoGPXmNFzbDtIHSmP4GnTnQ05mfeZg2UHqHK7nIsv3zmtUzWEM/rpmm3hWYD0JT9YHSBypfZWZcyZoPgpcnUBrz43rAfAN1aZU2UBrT32I2C6szLaPq6uxK77Aih/tjT1xnWG3Wb8C0AWYVzNPZk/WP9Sx/lpW9zAdgl2zA9Hwp1QUNZh6mM22gNKa/RTWLmpVpwazG6koPon7kmZE9mME8rgPMBVln9UGlq1pm5mH16I0PQ+kK7Nl5zC+k+oKZzrSKFf2ZNlD6W1SzqFmZFsxqrK70DmdymJntr2oql3VWH1S6qmVmHlbv9h50fR1W9jKbU10yVmMag3lQY2vUBlnPdfSzLBKZ7nOEys/65XVVC9CvPEzvcCaHmfzZqRpD1bKu6uq9ymWqOvbM71XuLt7Y07xEdcmO6LOLi+sBaiw3CB1ruH6bah6cn62zzh6kq3U5k2WZI/MGLNNZZw3f0c+YeaLOfB0N11dZ3c9sSFze/CCqjnon2/GgFjANdaw9Bc5QzcNqas0eBmavcCSPs6k50IPeDHqYj9VwnTXUkU5d9cFZlWclq/sZY25E/TAcZUWPr/G1M39tXmPMAv7KH34+59fO/LV5jTGmTf6Xhn/sjDFmE1b9N5Axxhhjfjv/AUoYoHwjJWtcAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAADpwXTaAAAAT0lEQVR4Xu2M0QoAIAwC/f+frpcF0aYxiIjYgS+eCBTP0SyM4ec4tgNDOYc6y/YfnoWOCug+dFRA96GjAvn+3hnD7cfJmpW5Z5s0R06Kg3TvszzEM9oo4wAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAO0lEQVR4XmNgGAWjgArgPxQTDUhSDAWjlpAERoglMElSMDaATw4rIEkxFIxaQhRAjy+iLSNK0SgYmgAA5uYzzYliycgAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIkAAAAWCAYAAAD0FL9fAAABGklEQVR4Xu3VgQrDIBAD0P7/T28cVJCQWK2W3WoelGE8nTs3dhxmZmZmOX0aTxYZz7QlvIBsX5gV55hdvz3VwBWXs4I6h8qV0Xo7tZqWpanqDDPnK2vvrt9Kq0lZmqjOoPIRWT5jaqpBrebVv8KeGqTmWBbqDN9brRm1ap/XUY1ReVB5DWvwkssrq8MsqIzls57a92+phqiM1eM4sLpQMjbPsqAyls94Ys9XUI1hecnwYa5qWM6yoDKW37Vyr1dZdYnKiv1ZFlQ+onU+O7UaxOZYxrAazNgYs1Dn9TzWs7Uto/XbwkbXRnK8LKzBccCMrQslxzkc97izZlt149kFBDWPec/anhrMCpZhjnNmZmY/hH9RV4+Zmd3yBafU4CCXV3DDAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIkAAAAWCAYAAAD0FL9fAAABEklEQVR4Xu3V0arDMAwD0P7/T2/4IRCElKatx9xEB8qlspNlzoUdh5mZmVlNn8FTRcUzbQkvoNo/TJVzbE1dQJXLUedQ+RO/2PP1RgOpMjB1hozzZeyxvNGAqgxQnUHlM6p8t1dQgxoNsdVme5CqsSz0GX62WjNytX9rasAqDyrvYQ9ecvvL+jALKmP5yJ0121NDUxnrx/fA+kLLWJ1lQWUsn/Vk7XbUsFneMnyYsx6WsyyojOVXZOyxvKxLVDL2Z1lQ+R2Zey1nNBxWYxnDejBj75iFPu/r2M/WXpWxx3Jw0L0rOV4W9uB7wIytCy3HGr5bsn7w7AKCqmM+s3amB7OGZZhjzczM7I/wJ+rsMTOzW76d5dslUp7xJgAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAVCAYAAABR915hAAAAYUlEQVR4Xu2NwQqAMAzF9v8/rXgoSNlSR9RTA70sI2+MptnnyA+Jy1d/tojgq9GK+ygNk1PQMDkNxclpKE5OQ3FyGoovXYgnt4I8OQ3FyWkoTk5Txckpfh+OwdllZm/Nd5xkxEO9zOPRAQAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAAAkklEQVR4Xu2QQQ7AIAgE/f+n29iogS0r0KS9lEk8sAxibK0ofsZBjkXEeQxezhawfEtmKOKyB1qZwhUEEffTh7BlHdazMoUrCHAJ1izrsHyxbQKWixlbqPJZZI4HOmyO5YttU8Auwizq3XCFAfslq8asY2UKVxhkFkQzhSsA8md2s7PneYuQBERnot5FSi6KtzkBG69jnUrbGqQAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAL8AAAAWCAYAAACR+U0gAAABJUlEQVR4Xu3Wy4rDQAxE0fz/TydoITAVVT/cNiTteyAwKqmVjQLzegEAAABA21s+wN86e8TuTW+f/nhmZu9w1178sNXD0jcj+6pelYXRbMXV+/Bn3PG1tObdPpcH7WmdXD5q5S02dOagWvNun8uD9rROLu85+w6bGzmMnMm51rzb5/KgPa2Ty53ZeTxM70C0r7VyfZcH7WmdXF4ZncODtQ6q6lXZkeu7PGhP6+RyZ3YeD+MOZDZPru/yoD2tk8t7zr7D5txhzObJ9V0etKd1cvmolbfYkDuoKj9m2kvVu+DyoD2tk8tnXLEDm3DHoHnWmVVvgr47qnpVFkazVXfsxI87HrMedqpyrZPu6c3p3xX9XmALo8fc+4EAAPD9r1fvAwAAtvMB34XhH3rN3+0AAAAASUVORK5CYII=>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAAAAWCAYAAACffPEKAAAA40lEQVR4Xu2RwQrDMAxD+/8/vZGDwQhJKIEuO/hBIJVsxbjPMwzDkPGBU1oH/RNUhtJ/BnvYDaR0ZDfD1b+KeljpC6V3ql/VMt3Vv4Z71OnKS1EZTEtQeRHubzFtoep3UBlMS1B5EX0JSQircxrqhfKYlqDyYnARLrB7eC+YjyiPaVdQAy6SJbF7R/Uz7SpsoL4A5iOqRvUzDcEZkmNxBczDUFbTYT5mFEq/ChsIB8XvDtb1O+vpOvNfQz3mBsVvNbjTmVc61qcc9fZB8CjQc32J3j2m7XDUu93w5xwtYRiGYfEFehi4SNs0wv0AAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAWCAYAAABXEBvcAAAA5ElEQVR4Xu2QwQrEQAhD5/9/epc9CGLVxNFDWXwwhxpNNecsy7Ismg94DHYmehqr2Z6o/lq8JSsHZH032l8EKGSagA6tasjvVTCLoh50MNK0nvVWmPKBMD9CPZ5eCUV0G2aHKR8I8yPUY3X7jZDgqnMZk14h7NJZjz7+NoibGcS0nwuzOOrxNK+WcRt8xqRXCLN0V0fIPLOLhw6ffSMwhl0doWeZfSpM+YSgZZmDkP4j0r0648cy5ROSLRvVNSjgSIvqQqZVmPJ5oA+PHsL2Z0+wdfsfq3k9FTqzy9kA22yAy7JovreWu0Vjwq8gAAAAAElFTkSuQmCC>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAS4AAAAWCAYAAAB+HnE3AAACyUlEQVR4Xu2S4a6rMAyD9/4vfa/6I1Jk2UnoNg4Df1IFtZ0S2r5exhhjjDHGGGOMMcbcj38wOo7mvwX2geNpHP3/o/lvgX3gMKZkclGudqFUL0q/O9PzmebOhPVyxT7NxZhckKtdpKqXyrsr0/OZZM5G9TP9J/NA8uXoLsgkcwZdH51/FT7dY3WOWWP+X6H6XVT/8+vc8Z9OJTawuyBXukRdH5V3Jb7Rp9qb6TmfTdVP5f06d/2v0+gudOcH4Xd5zGVtSpVX+gK/rdbJOeYHk0zFbl1F18/Uj4zKqxzLVqgapQf5e5hDrcuhvmBaUNVNeaf28eTNZwfBDp+BnjpYlVF5BdZM6tGf1CxUBjWcT9ipYbD/ynR+gJ7aI5bJ75hX5DwOBfOxn3hiNs9RR5i2wDqV69itM6/6EPC92mj0WJ7NUZtS1TGPfYtpC6UHnX+Eb6yD/eG7+ibzlIZz1KZUtcxj2iK07Kkc6kpjRFb5R/jEGo8FDxrn+V1tNNOrfDDJKKo6ti7OFyy3CD2PDHosg2B2Mo6Q81iP72ptplf5YJJRVLW4F10WURrqSmPknlgdgtnJMA24SXnjKg9hepUPJhlGV8d8nC9YLgiPZZi2yyfWwTVyf5WHML3KB5MMI+pULfpdFkFN1TMd5wj2tsM7tY8GN646DKUvmJ415aOOc0WXYz5q7PsLpeH/sNwOn1gH14j+pnqAepUNWAbnClabQR/nGaajpupRyzn8PqLWnLBb92jUhle6Aj1cI18C9h7zKSobazIfNZabaoup1rFTkznaH9MD9FQ+65hheQXWZpg31Radpt5jHto0t8M7tY8kNjyP7OV3Nhjo45xpOK/AHtRQsBzOUUMvgxmV69itW1Tf7/4J8wvm45xpOO/A76jBwEyVQ1QNW2+SQ/8o79Yb82f48j4Xn735WXx5n4vP3hhjjDHGGGOM2eM/akuefjS/ij0AAAAASUVORK5CYII=>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAOklEQVR4XmNgGMbgPxaMAdAFiVYIAhhiOHWjA2wKsYlhF2TAIjaACkEAmyA2MayC2MTAAOYEZDz8AACKkCTcm0kehAAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAaCAYAAAC6nQw6AAAAY0lEQVR4Xu2QQQoAIQwD+/9Pr3hY0Ga2ahH20gEPSZugmhW/8biTgsJeb+FDVLwkFSLekpM/wj0xQI+MsylLRZ0v72oRzdi02MfCKBDpjnhimHpyA9BqADs78m4K+TntFEWaBlpdQb9lGxH2AAAAAElFTkSuQmCC>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAOUlEQVR4XmNgGPrgP7oANgBSRFAhTBFehTBJvAqRJfAqRAY4FaILUqYQQ4ABh0JsgM4KYZLoeHgBAIs7It5KB4nbAAAAAElFTkSuQmCC>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAPUlEQVR4XmNgGKbgPw6MAfBKIgOCCmCAJIXIitH5cIBNEJsYVkC+QlzuwRAjWiEIoAvi0gwGMEm8ioY8AADJ0h/hjJBXIQAAAABJRU5ErkJggg==>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAHUlEQVR4XmNgGObgPxQTBKMK8YIBUAhTgI6HHwAAfIUb5Y5mbp4AAAAASUVORK5CYII=>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAPUlEQVR4XmNgGMbgPxrGCtAlcCpGF8SpEB3gVUiUG5EB0QpBgGTFGAIYggxYxChSiE0MDJAlYGysCoc8AACbRyPdctpiSQAAAABJRU5ErkJggg==>

[image20]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALAAAAAZCAYAAACRpKR4AAACXklEQVR4Xu2UjW6DQAyD+/4vvemkZQrGcULhrrDlk5A42/kBqr5eTdM0TdM0f4qvn6tpjEf9JqJF7SHwyrwrmdl7FrPfybtEO0X6gGm/3PVBEbVbZffMz6jMuBtq509/dzYz2oVpOzEqXkE2N9tNeVexYgaSPXcG1uM50lbAZqpddjoKqngmlbkqo7wrWTEDOfNsrLaqzYbNy/bYeFl4JZVdlF+pv4IVM5AzM/G92PlMz6tgO2S7bTwfzgpnU5mtMmr/6kfDHObxXb3TE4l6oY5+BOaxDjX0M1itqo/2MA9hOc/GZ2GmzaYyU2WiFzTwGvMHrDbSkEiL9CPnQdSLwXKoWb9IV5jvs6yOaQOvVTKMTR1rYhrqM6nMU5nKzpF/RMfzALVoFzwPWA7JfA/Loqb2Q81jXpYbRBmvVTKMTR1rYhrqiM9VLsXZjPKMKFPV8WygZjm8GJhhOaYxqvXRLKYxspzyvR7lmObZ1LEmpqE+k2xetpPyjCjD9Ko2QC3KRfhnY3VMY1Tro1lMY2Q55ZseZZiGbGpZI9NQn0k2T/mVfb2POVZ7RMN7lmOwTFVjsLlqP5ZFjZFlVB/cwWvq3rPrj8FdYBHRTNsn8xUqgx6bh2cDM+ze8D1Yv0hTZw/Ws7O/x15MY2QZ1gc1PBumMc/Y1Zrgr0/AZuNe3kcdfc8Rn+WYNsjykT9An2UGme9hWTwbOJtlGJUc9sWao7pHedqcTLb4Ku6yxyqe9qy33vcOy/23H/DT6G/jwJeB5+ZePOL7rF7S/nFXz22O8ajv86hlm+n076FpmqZpmiv4BihRJvZyQlxUAAAAAElFTkSuQmCC>

[image21]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO8AAAAWCAYAAAAo7ctoAAABsElEQVR4Xu3T4Y7DIAwD4L3/S+/UH5EiyzEpt9LR+ZOmE4kptHCvl5mZmZmZmdnvecMvak+G75zf9+nvbg/BLipe5iep3q36R36iX3rXx6oOj9VZbTejCzvq/9eVz+7A9XFsm1AHx+oqv4Pu/juZWd09XAXXvns/NikOjh1et7aT7v67uRlXPnukOmvbUP7nrQ4VMyyba1UmjPqHT2WyblZl8ppVjvVxHvZXyevetQf7ILxQ1aGqevzNfcxiP2oInzGbQZ2MwuZjrTPG2kqx/sz3sw1UhzmqsX5gz8TxgV0u1Mmgs3lUzcdalQuqtwLb38z3tC/GDpLVMtXPF0RdFMywHPZZBnVzB8ypuVgf7YvVVmL7UvvN8N1GP7uQ+sCsx2qZ6qse07kEnUw4k0NqLqurfbHaSmxfar+2IXaQrNbVmcsyeKk6mcpsRj2/szc1Hom1z/wUlunOtS9SHRY7yLPjDlyHPQNrbIw1pcqq57Ae1nActTPjVXBdtnf7YnFYcXD5V1EZVkOjdbA/m1FwbvcZmGdzsD/K3AX3eOdebIIPzN/g4G9gZmZmZmZmZrf7A6xgYa1Bsi6GAAAAAElFTkSuQmCC>

[image22]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAUCAYAAABroNZJAAAAMklEQVR4XmNgGAWjACv4jy5ADqCKISBANYOoAkCugbsIxiEXDyyg2AUUGwACVDFkkAIAtFcX6egQ5fEAAAAASUVORK5CYII=>

[image23]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQkAAAAWCAYAAADTn2meAAACZElEQVR4Xu2TWW7kMBBDc/9Lz6A+ChAIsrQ5bXXEBxiJuMhly/3zY4wxxhhjjDHGGHMG/4rrFE6caZdT3/Uq+Dx/5blMAx7oaYd9yhyK1flUT+kJnk+V/W3Y/Zlmvhx1oKcctppD6Z9i94eKvdH90Ovlf4vqvqhX2VGe2MMsUL30Uw5FzXDSfLNzVJ2ex6g6PVZ6s/ebzTN299jpXk314nYP5SnUDEr/NCvvqer0PEbV6bHSy/uNdkdzFbt77PavRb246gNoP5CRDKI8pgWthvdWnU8yMgPOWnV6HqPq9Fjptc+j+pip8ui1f9m1wmrvatQLV3qg9BbMtGs8/BamBUpj+hv0ZkE/16rT8xhVp8dOj10MpQfosX2YNstu/0rUi1cay+M6YLkgNeYzLVAa09+iNw96I3nlV7ryeqz2kJwB98N1y2ieabM8scd1sAMKmN5+AOpjSHoZpjMtUBrT36Kah+lVPqj8SldekP7MtQLr4jph2WBUU+BzjFyGUL0gpjOt4on9mRYo/S2qeZhe5YPKr3Tl9ZjtVXk2B64Tlg1GtVme2OMq1AEFzGMag2VQY2vUglZvfcyzbkvmZ64Zqg7TW035TA8qXXk9ZntVns2h1irb+q2+yxN7XAU7oGRGx4PEDK4D1FgvSB09XL8NmzFBHbPoB5hB0Ovle8x2VZ7NgRr+z9ap4d8E16Os9q6jPQg8pET5qI90RzKoJUxDHb1PgnOoedDDdYL7sEyAOsvMMNPH2ao5kyrDPFy3Guoz7HSN+Up2fzTJzB4sy7QT+ZY5jTmOW348tzynMcYYY4wxxpzGf3bzDRA8Lb5vAAAAAElFTkSuQmCC>

[image24]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWQAAAAWCAYAAAD3huZeAAAD4klEQVR4Xu2UgW7mMAiD9/4vfSek44QsG0j+rV1aPqlasU1C0/77+hqGYRiGYRiGYRiGYRiGV/Pn38XIvGHY5djvygfvXHewsz/OjddwHdWZRw/fU+Vl/lvA58ZrOAx8gfgymXY1u3uznruf5W2snnP1fna9p6OeXelv4fhnVy9Q6RU7PchP7L275rBGdsbM8/fCPEPpRuY9nerMlPd0jnpuNqx6eUzrsNvnqHkqOn2VP3xGdr7q/bi+470VdSaRTuapHPHc6gVl+h2oeSo6fZU/fEZ2vur9uL7jvRV1JpFO5qkc/dyrw8cfSXUh6GWZVTp9zMeZ2TqoY40a9kcwo7Isx7Ldfa8g27/y0M+eG2tFdS7osxz2Yw8SfcygpnIVnR6VwflYDnWsUcP+CGZUluVYFnOMyv/VdAdnD1nVEezH2lF6RuclGcxHDdfB+yqvNAO1LFftazDtLtSMRuYZzPcaPcwxsMc1rHFdlvG/6LMs0/BerYW9CtbPUBnUMIf3VV5pBmpZbndfBsseQXdo9YDVITrMY5rBtAq1VoRlsDaYZrB+Q2moKw1RWtS9xizWV8LmcTLPiD7mql6E5Vm9oqFu4MwqE//ivaP6GZ2smhtrg2kG6zeUhrrSEKW5vvIsDssfQWfo7OGirnI7+ipqrQhmsHaYZnTzLMc0Y0Vjs+N1J9kMmWdEH3NVL4Jngr1MM3Z15RtMVxrTGZ0syzDNYJrRzbMc04wVzXW/xytjJdO9LqGzUTZQ1FVuRce6Q+fQWAZrh2kGy2NtqBxqRkdjvUy7m2ymzDMyP3oqE6kyaq8V3bV4MZiOWtbPqPJqJqYZTDNYHmtD5VAzOhr2Yt1hp+d2ukNnuezg/B511FgP3mew9SPuY0Zp7N5rpiEql2k7+6LWxXu7V5csn3lG5q/OUuXYWlHLPKYx32E6alk/o8qq9Zgea+YxDVG5TFvZF+sOOz230x2a5VBjdbxntWvooVaB60eUbmAfq+M9W6vS4vOgHjX0ItjrdLUryfavPOVnHoNl8azxvNGPqLyqlWZUGvMRlVF7OuizOt6ztSrN77Hf6+hHL4K9riEs52TeryIeDF4ZmGX5VQ/rqKHOwHnYVcGyWK9oBltT6VhHjeUjmFG5K8lmyGbc9Rh4JqyXeVg71VoGZrIcUvUYuDa7OrA81iuawdZUOtZRY3kHfZaJVP4wbHPSx5XNmv2QlG5k3hXcvf/b+PS8s+9sGD7mSR/Xac9y2rxP4NMzn3/Iw7fAPiSsTyCbOfN+I6fNexI/9b1/xxrD8B/2oZ5GNn/mDe/jO7/371pnGB5H9uPIvGHY4ahv6i8tv9JY+IiZOQAAAABJRU5ErkJggg==>

[image25]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcwAAAAWCAYAAABNCax7AAAEKklEQVR4Xu2Vga7bOgxD9/8/vcHAE6BHkLLstE7b8ADGIoqy5MTd/fPHGGOMMcYYY4wxxhhjjDE/yN//1lN42nk/CfXe/U3MS4iL1Fl3sNMf58ZlzvHqd/7p37KaC2d/xTnUHko/CZ4RFwM9ylvlMTbmZeDFw0vItNPs9mY1d5/laaj3jPdK+RiVf3fPVzHryea6Om9Vq/RTqNmUHszyA+VR+kDpxmyhLpvSZ+zUIO/ovbunWYO9Y9TiW6CuYF7UMD7FrGc1l9JnvGPPV1HNNlC5Wd2gyquc0o2Zwi6PuqhM67BbF6h5ZnTqZnlzDfZ+47tgjmkM5utq76bTr/LszFzVKP0ksxl2569ygfIovcOVWvPFqIta6Xeg5pnRqZvlzTXY+43vgjmmMdCn9usyq5vlMx1v5alyiursSj/JbIad+ZWOKJ/SO1ypNT/I6oWIC99ZCOYqzyqdOpbHmdk+qGOMGtZn0KO8zMe83b4nWOmv5sXzoA81zHdY9Ss6+yhPNbc6e84xlH6S2Qw78ysdUb6q54zdOvOjdC8Eu3SzOIP1GAdKr4iaWR3Lo4b74PPMr7QBapVv1nfAtLtQMyqUHzX0Raz0LszLNEWnH/Ow2TOooxfjjNJPUc0WVB6Ww7hCedm+XXbrzA/SvQzqwmVNeQYsx7QB02aovTLMg/GAaQNWP1Aa6kpDlJb1iNGL8UnYPIzKx3TUqrOj1uGddSxf1TEd/cwzQN8ddPpXc1a5Dqr2yr67deYH6VyG6rLhD5n5dvRV1F4Z9GAcMG3Q9TMf0wYrGpsd1510Z1AeVY+aOi/TOuzUDDr9WH51ftSZZ4A+Re7fWSt0/JUHe1ZehvLjvgw8d2eZh9H56NXlyLryregYd+hcYObBOGDagPkxHigfaoOOxmqZdjdXZ1L1qIVP6SuEf7VuMOun8qvzZ53lB6r2JJ0Zup74d+ZFlH9nr2C3zvwY3UtU+bKOvuriZ43V4HMF2z8TefQojT1HzDRE+Sptpy9qXaK2u7p0/FWe1ec4ntVsTKtA/0rtAOsRlV+dP+tqXuU5iZo/mOWDK+dQNd3ejN0682N0LxHzocbi/Mzi0DCH2gzcP6P0AdaxOD+zvWZaPg/qWcNcBmuDrnYS1T+fFxd6qjg/Yy+mMbq+DtU+qg/q8Yx6aCxmOmqnUTMoXbHqz6i6d+xpHkBcHLYq0Mv8qzmMs4Y6A+dhawbzYryiDdieSsc4a8yfQY/ynYTNgDPiyjAd4wD3YR7GzDfLZ5gXZ0LPSq7Kd/QT4Ly4VtmpCVSt0jtcqTXGHOabfrB3zHpHz+DO3ub/qD/QSu9ypdYYcxj/YI2Zo/4wKr3LlVpjzJtgP2yMv4FvnPkKTzvvp6K+g9KNMT8A+8P5bXz7/Ks87byfRPXuq5wxxnwMT/vP6mnn/XT8Pcw2/wBycKCKceHofQAAAABJRU5ErkJggg==>

[image26]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAZCAYAAADNAiUZAAAAkElEQVR4Xu2OQQrDMAwE/f9PN6iQoKxmVSeQHIoHfNDsyvYYi0Xlk85l8vKdC2invbOIYYoG6tJ8ckUY56CuzgW3pM6hXZ2n6Rb3bM+1m3PttlCJlmddQO6AQvfjWReQ+9ItzHpyATlbDigjF3S+CJV5drm6oPNF0NE8kx1lLfoQPRpopkf5lT/Gq48tFn/IBlUjfIRaX6xiAAAAAElFTkSuQmCC>

[image27]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAAZCAYAAACGqvb0AAAAzklEQVR4Xu3R4QrCMAwE4L7/SyudFNrz0iVNBgr3wX6svZxRWxMR+XjBM85+Ge68e0zskp0x3lyEd3HM4Qy+L8yLQxVdrIPtie8dy3XszAxnZDvZvHWGWK5jZ2a4wmkv2wnP8H7A3NYIuweCqrq9Pd7cYv4RjgpuZHq9c97cVmZRVNHjna/4rEtFUXa+i3RU7HzJFGVmZ5GekfXmt05LTucQ+yL4PmP5LRYOl7R4/s78L+JjubtfjCCWuwsehPtYu+GdlfuCAXwXERGR//MGIAyWaiqoaAYAAAAASUVORK5CYII=>

[image28]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAUCAYAAACJfM0wAAAAYklEQVR4Xu2QQQoAIQzE/P+nFQRBx2kdsPVkwEtNw66lfF5SyQlhDoWFrRCbIa6TFrZQlhRnQ1lSnAV1QfU61pszVM+NjjvlLOBwEwhHhwlshhwd/BX8egvXwVhY+Ia08FsaDs48xGUGQpAAAAAASUVORK5CYII=>

[image29]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAZCAYAAACRiGY9AAAArklEQVR4Xu3SwQ6AMAgD0P3/T+tpZmLBdTC99CVeGHRobE1EvnKYp9f+YHeJHhc6fB3ayC6OXgLVLrDYgoHNvDtRHdXCxb26FWWsQFneHah2NaNDVIt4OQwvI6o/jC8FGxZUZnVLmfbl6ABHRVbJTukAIJOZmb0pCTFWl6PmosbojJX9fTKzNyUhLZ9DfxCvkQoxMrMIldcbxy9BBQCZ2ZHdZ3q31wbC1IUiIiITTtMJd4nCaHybAAAAAElFTkSuQmCC>

[image30]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAZUlEQVR4Xu3RQQ6AIBBDUe5/aQ0sDNSa/BHGjbyEzaRMo5Sy/d4hJ4UupmUkc9FwSolKK3nzJpHsIHIxkr2hX0Qyj7Sk/5X0DNzQzRySadxCN3NIpnHB5SVVv5QWVDQ35ZOSba0TlGs6xhPiR9cAAAAASUVORK5CYII=>

[image31]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAZCAYAAACRiGY9AAAAnElEQVR4Xu2SwQ7AIAhD/f+f3k6ahRWECbpDX8KlQi1urRFCdnGJ6toJZBarVNDhdKgQGRwtgbQBFJsxUIx2J9KRZgbX9GrQvVpOpJmfEGnVWFk0/cVzKdjwEz7lk8t5DeSMp6KszA6WDZJJy5NikkRoKavROttNaCkLr8nzf/dWhPCc1hgyKSaUpTfKV3QbFCLzuLNNGwghhJAD3K3RfIT/SOa0AAAAAElFTkSuQmCC>

[image32]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAZUlEQVR4Xu2Q0QrAIAwD+/8/rTiYuJDhCSoIHvjQeiHQiMtJJF2sYHlJKaAl1PvwhmiYepU2QMPUe1BZ5z+oZ6Fh6llomHpW1F2ZR18XJAX3LDRMPQsNU6+iNyW37f1PYUvJZS4Z/vsu0vbqMIEAAAAASUVORK5CYII=>

[image33]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAZCAYAAACRiGY9AAAAsElEQVR4Xu2QwQ7DIAxD+f+f3k4glNqhNmXVpDypF+M4TlsriuJXfMLXtTeIXbKPgh6XQweJxdERSBtAsSUDh2E7kY60tDjTXbJdM8jDZpE2zOgRaQ4sH8G8mX5hPgoaNnkq0+oXj5MDmj+3YqfTwAlQ/QpOH4gS8thSgpSfGbM3hjNzB+moDDekF3DnI3IeM0ohC3azpPlunP+EFCCiZMc+t7stDYd4a29RFEXxH3wB06l1i/23EowAAAAASUVORK5CYII=>

[image34]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAV0lEQVR4Xu3QwQoAIAgDUP//pwuCDsmMKVJBPuhQzAaKlO81cNJFP/fmQ94r0atih9kcpEstTMZ0pWTePWeBHtEbwmQGFEwvQdhhNjds97nhyYYdKSm5Oj5iNMwZ2+89AAAAAElFTkSuQmCC>

[image35]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAZCAYAAACSP2gVAAAA/UlEQVR4Xu2R2wrDMAxD+/8/vZGSFONI8WUZ3YoP9EWWNMc7jqIoiu28tJChlchvaHegd1l9Fh6PCSrxLhDB26ePgA6CNASa607kuWBDM+jAtYCCeZGONImes12QdsICDaZ7yeZRju2JNImejx6mT7BAA2keWJ8Hll3pDDRj70XaiQxAQ4AdHYxMbyRj7q4PtTQrov4oP9cfDnSyOYtv9TbS3alQJ/2jhEyfx2/2roarmZcdHQ3zIQCP3+OhfBQWZB4nGfloR9TfmDKT0Mks5CXam9nF8suj0z9gCNo0GW9A7xPZzfLpPto9CQ/hqe/aRh1oQR3HoA5UFMXf8wa5rq1T76kyHQAAAABJRU5ErkJggg==>

[image36]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAUCAYAAACJfM0wAAAAbElEQVR4Xu2RywqAMBAD+/8/rZcqIeRRRdCDAz00O9lDO8bPG2xwHoOX8f0WaonKmOpUwRB7cViI3WOIHxcLQPTcIpUx0XFDlyPRcUPO+anSOQsKlyPVUYLKmOpUwVB7/Ea1MFn11sXJVf+j7BmqNcuiXIJvAAAAAElFTkSuQmCC>

[image37]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAWCAYAAADuKF/RAAAA2klEQVR4Xu3V0QrDIBBE0fz/T7f0QZBhVl3dhNLeA31wskpxUnpdAAAA3+ElH/wQLTdbcDS/c+bqHB6WKfFDZ3W/rmcys7iBKyzz63Yzmq2e5ZzsxSZ36Scvxeq+jMz3wU1GJegzndFn+vxU9XlYFJWpua77bDZ3ovo8TESX7YrIZprvqDgDCVFxmXyUaZ5xuh+bokuPCnH5KNN8xe4+FHAX3zJXTJ/1z0azmo9k51GsL80VGK1bpuW5tWaR1TncSF8ELbxxua4bPcfN4I/xQgCop387sw8A4FFvFoOlWxDP29AAAAAASUVORK5CYII=>

[image38]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAOCAYAAACSNkBdAAAEQklEQVR4Xu2W264jOwhE5/9/+hz5wRJaUwUkfUknw5IiQ1HGuLu3tP/8GYZhGIZhGIZhGIZhGIbhHP4Tv6vheXeceQZuZuaK6On43+XKvmf2zvpltW8hu0NWI9tb+Tueq4mz8vdJsjmc/k24O2T3VnS9Xd/VxPt9ap7sfKcrsj6k67sCPvNX5v4E2XxOV2R9SNf3NmzO/ExUb6U9Dc5Y5QtqMWftDNSHUuWvcGSvwvVz+reh7qHeUUXnu1F9mV+Nm/OOOaoz1PNZKO2JZHOeebfOe+N5zO+Ec3wCd3+lZfAuav/W6L0Ld+7VM7jn0cHtVVoG76v23/J+2JD5WVzV92qquau64p09Hdi3yru8u69C9VXat7HusH9Ri2uXyl/V78bd+0o6ZyiP0p5INSfrfAcdOv6O5y44yzt3Pgt1rtIyOv6O5wjd/nzW3X2fQs2ntIyOv+M5xH7wfAGbrbEe9UzrUu2N51frRumZxjiyz1f12DN6lHeT1Y5Q9WVdzapi3nHDfhvuI1mdGs/jXtaJ2sM4Qi9Xxgru4bpxPaNf6RFqzBfUOA/rR3C91D3c6uJKU2Q+alX/TOvGMafH6RXKz33KE2O3RiqtitX+d1H9ma/V+TrxRmmL7F7U1BmdOSNKf2Wfq2+q+ibzqRrPj/d18ysv9bgqMg+16gxVJ5WHGs+JyBqNLne6y0lVX6jLcn0njrny0JuxvPQzX1BT515Bdk6Wu3hTafFZKi+JfrVG3DmEPuXtxBHncX5CX5aztlB3IKrm+rr4TFxfd7byU1v5/hGlRfgMuW5crmZ13ojaxzjmzkO/4lXPu2cqj9KI04/wyrmqrrRFtofQy3Wj8mx+5gtqqgfP51px1Md5VLypNBczZy3C+3PdqDw7g/mi0mJP6gqpU3ylaVWPuLrrQb+aibmLI0pXWoY6hz2ynLWjuN48J8vdPRauxnzjdAW93bw7+0J5szjiPM6/yHzMI+oemX+jPJ0eTj+K6kutmk/VlW/hdEJfN6feIdvjau485hHucV7qyu/iiNKVRjqeV1j93LwujnR051HQ28mzs5gvKk3VN1ktctT3iq60SHa3rKagp5NnZzBfVJqqL5y+4Bx/md0BLt5UdQWHYbxz6mrtxGou5XsFt5+93H2Owl7VDC7f8ykPfSqOOF1Bb5VvlN7Rdu7WTsyVqD2MFaqviyNKX5rqF3H6EVxPdQ+ukcy/Yd5B9VW5OpP+TeXlPlVzGvcStY8xcxW7lVDP/FntKOyp7tSJ3+nTgX7VS2kxznps1D7idEXHm3lUTWkV6hl04oxsj6opLcZZj83SnH+jdHXeANSDUdowDPcxf4PP4F94D0++4x2z3XHGrzLP7gaq/36H4an88jc7f5fPYb2D/ftFnv6t/fKz/wXm/dzIPOzhW/nl73b+Lp/Fr7+Lp9/v6fP968z7GYZhGIZhGIZhGIZhGIbH8j/DV0jiWD/oQAAAAABJRU5ErkJggg==>

[image39]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAXUlEQVR4Xu2Q0QoAIAgD9/8/XdBT2IyNKAg88KE6XQgUxSEtlIQqZkPZ3YIkIf99PFMkCY9CGCyUIkkJ10PSgHmvajF2bxRLhu8P3CbXHzhNcZXy2iQJ6+ArIcWHdABiPcOXVSxwAAAAAElFTkSuQmCC>

[image40]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAWCAYAAAA1vze2AAAAX0lEQVR4Xu2P0QqAMAwD8/8/rQgTRmzYgTgQetCHjltCpaZ5yWGDwKKewb5HkDTwUN8jSAp8WnKH479YNLaUXJRF85l0VhCHScrFvpcgSZtLVm8lSBrMoemyEiQ1/+QExuE+wngld8wAAAAASUVORK5CYII=>

[image41]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbIAAAAWCAYAAACliRlQAAAEpklEQVR4Xu2WC24cQQhEff9LJ2pFROSloKFn1vsxTxp5KAqaZtdOvr6GYRiGYRiGYRiGYRiGYRiGYRiGYejyC887wJn93O9yh08g+gwiuv5hT3enXf/Qg/udXTfh0rqLi/wnPau+LtkcWW54LNW9z2f0OCp79fvfeYdz1H5n74d0l0Yv6xnv6Hgr7L4Iu/zwOKp7r/qGPpXdzu/I95DtONKHL724zpdWeahVeymu1C6q9RXP8Ie7dmV9ss+o4hnOqey34vnJ3LWT3X53+Xfj1ruo5ZhGXUFPta5DZx5Sran6hvt25ftEPU0//fyHnMp+/e9f5PnJ3LWT3X6z3Dvy8PtkX1rm6GGO+at0+lXPVx7e00ONXh/Tu6CeeRedfpFvp3fo+iN8H9Vzl/f4+9GrdMYe5f9U7I7RfXd5j98bvUpn7FH+V+WuGbP7Kp37VvXUGUfQp/zZuRVOalpEg1Fn7LWd7wrVflUf4exEaQt1XhRX98R4wRr7qXT/Tk+k7ej6FTyXPXexR+X8ne0nz2NdpH0q/r67u6u8hzn2pqbiTHtl7povurvSF9To47vyK+hlbNpV7ugREjWPLtPRqJ9Q7XHHmao+ipV34bWKlx76VD++e9jPo7QKJzWEPRh7djmVpx55/Ds9jCMqPutf8X4X2f05J2OPyvG+7G8wTw/jhfdGdR3uqL8D1Searaotqj0yn+n2Th/jCic1JdSAi46eadQ7dOuzM32u4qOmUN5FpO10zhbVGFluoeqVZvDcytOBfsaeKJedS53xwmu8i/IrIm9Vy+A8laeD97OevRgbrDOoMzZM4z0iv6FySttROcvgbLuni6pR/RgbSltU/ZnPdD+Pmk1Bb+W5RNQgaq70TKNe4WrdrjbLq3rGRuSltlA6NcY7dl7VT2kVTmp28O4exkY2P/VuXCWaoao9C84S3cOIclEddcam+XfmM5S322PR9Svu6qH6mF7ZldIWys94EfkqZ59wV59/UE1NU8N7bXdR06hndP2KSo8sz1x0Z4szzecqXuW5Avsx7nBalxHdWWnGLnclrmA1qraqPQvO4vcf5RRRjjpj0/w78xnK2+2x6PoVj+xhd9rtinlP1R/56KXnlLv6/MWG48M8Y9M4kIqpRVR9VbJ+u7mYi+6s+kTeKKa2iDTqjBX0qD5VTusMVR/NE+kLlVPaQmkelY96LbweeTzm4c9noc6P7qs0Q9UwXtAXeQjrMuiN3g36T3lkD85osdJ87N/Z22uZV51lOlHajpOaED8sH4/SGRvsozzfCWfxM2WzRX7WKG2R6YTnUGPOE+ke9sn67bhSx8fnPPQxb9BT9RHmlSei4u32fBS8o5+J7+pR0KN8u/yCnsyn8Hrk8WRndDjtwbuqeaJcpnmUttjpqr/BvPJUOK17Cq807CvN8myu7OJK7aeQ/SIzXkTeoY/aIXebfT5GpHe5q8+rke3uDh7Ze/hA1BdGaVWu1H4CvP8uXvCP7HCO2h81xoqKp8JdfV6N+YfsAra86jPs4a5mb+eo3VGzmPpivrvXqO6OHsYLpf1U1F4ZD8PTUV/UYfipzO/D/8x/soZhGN6E+WP9QfwGuGxF8/iFnVUAAAAASUVORK5CYII=>

[image42]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGoAAAAWCAYAAAAowQktAAAA0UlEQVR4Xu3U2woDIQwE0P3/n97iQ0CGyZqk9qLOgX3IGEOJ0OsSERHZ1w2ffEl14d6dykNG+45UWWgP77A5WD/J9B6JLXiE9UeziMpv2l5lKdhfmRHxqblLiizDeqwP+/EsMjNj9rwljZaA51j3Gctnmj1vKWzBhp1Fs8bLs2bNWZq3hEzOssbLo969vxVvGZmcZY2Xj1Tvbc1bCsv7rD9jvY2Xe7L9R/GWg7nV7KFY3bCMifYdqV88PoJhOdYG57Ae+TN6JJFfwr/M0ScikvACxGKTbSdug/EAAAAASUVORK5CYII=>

[image43]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHIAAAAWCAYAAAAcuMgxAAAAzUlEQVR4Xu3UwQrEIAxF0f7/T8/QhSCXRE2s0Oo70IXPmEUCvS4RERFZ5YdPXiK7EO9NZtGjdWLIDLzGN+zDc0+kVgzRgd+semaZvsXM22Nlhsb6TI8Rq/puaWRYpabUsZ53vJ+1oud2ekPiPc911qub9XS/rbQGbt1FM+YZT/XZmjekSN7KmEfMvj+KN6xI3sqYj8i+O5o3NCuvs/quVcu8JVovFW94zLkYvrHOzDyjdWKoF8MlFVbOc8E+Vo18jJYo8mX8Jfc+EZEX+QNGUZpmVAfzawAAAABJRU5ErkJggg==>