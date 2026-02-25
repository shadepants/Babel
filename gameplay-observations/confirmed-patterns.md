# Confirmed Patterns -- Babel RPG Session Corpus

Patterns promoted from deferred-patterns.md after sufficient session evidence.
Each entry: what it is, when confirmed, what it means for system design.

---

## P2: Narrative Callback Density
**Confirmed:** 2026-02-24 (multiple sessions)
**What it means:** Models actively track earlier context and reference it without any
"remember X" scaffolding. Callbacks span 2+ rounds reliably.
**Evidence:** mp-03 Kaspar referenced arbiter's lip color from own R1 examination in R3.
mp-01 Aldric recalled Brix's trap report verbatim in R3. Long-8r: Gemini used
"Geometers' script" (coined R1) in R4 and "hybrid mark" in R5. Long-celestial (f81a5c257ed6):
"Dragon's Heart" trajectory coined R1 paid off in R5-R6; "Probability Engine" coined R2
activated R5 -- strongest single callback in corpus.
**Design implication:** Context window alone handles continuity for short sessions.
Memory injection likely only needed at 8+ rounds.

---

## P4: Character Voice Consistency
**Confirmed:** 2026-02-24 (8+ sessions)
**What it means:** char_class + motivation fields alone (no "stay in character" instruction)
maintain consistent character voice across 4-round sessions. Models do not drift from
their established register unless given conflicting signals.
**Evidence:** Deepseek/Mira (temple -> pragmatism arc), Mistral/Soto (skeptic-engineer
across starship crisis), GPT-4o-mini/Kaspar (measured border-lord cadence). Deepseek
Kael/Nessa (military/diplomatic voices held across 4 rounds even as same model).
**Design implication:** Don't over-specify system prompts. char_class + motivation
is sufficient for 4-round sessions. Re-evaluate for 8+ rounds if context decay appears.

---

## P5: Tension Escalation Pattern
**Confirmed:** 2026-02-24 (6+ sessions)
**What it means:** DM models self-pace to a rising-stakes structure across 4 rounds without
explicit pacing instruction. Each session escalates: inciting incident -> complication ->
crisis -> resolution/cliffhanger.
**Evidence:** mp-01 (bickering -> trap -> guardian -> three-key choice), mp-02 (debate ->
countdown -> probe plan -> chorus response), mp-03 (accusation -> forensics -> deduction ->
pivot). Consistent across Claude, Gemini Flash, and Deepseek as DM. Long-celestial
sustained escalation over 6 rounds (confirmation that pattern holds beyond 4 rounds).
**Design implication:** 4-round sessions don't need pacing prompts. For 8+ rounds,
may need explicit act-structure hints to prevent mid-session plateau.

---

---

## P7: Adversarial Objectives Produce Better Drama
**Confirmed:** 2026-02-25 (2 controlled sessions: 7ef09c722ac4 aligned, 10e6bd913417 adversarial)
**What it means:** Party sessions with incompatible/adversarial objectives produce
measurably higher dramatic output than aligned sessions under otherwise identical
conditions (same round count, same tier hook, comparable party size).
**Evidence:**
- 7ef09c722ac4 (p7-aligned-baseline, Claude DM, 5 rounds): Aligned party. ~10s/turn,
  2 narrative stages, 1 unified outcome, zero inter-party conflict. Smooth, low-drama arc.
- 10e6bd913417 (p7-adversarial-zerosum, Mistral DM, 5 rounds): Adversarial party.
  15-28s/turn, 5 distinct narrative stages, 3 independent outcomes, inter-party tension
  every round. DM added environmental threats (sea serpent) triggered by party conflict.
  Callback density higher: party members cited each other's moves as leverage.
- Prior evidence (mp-01, mp-03): Same pattern across earlier multi-party sessions.
**Design implication:** For high-drama sessions, prefer adversarial or mixed-objective
party compositions. Adversarial sessions reach climax in fewer rounds. The DM also
escalates more aggressively when player conflict signals dramatic pressure. Consider
a "party_dynamic" session config option: "cooperative" / "adversarial" / "mixed".

---

## P8: GPT-4o-mini Character Overreach in Healer/Support Roles
**Confirmed:** 2026-02-25 (2 sessions: 6e41150ea58d mp-01, 791ff6ecb8e9 p8-healer)
**What it means:** GPT-4o-mini in healer/support roles writes complete dialogue and
action blocks for OTHER party characters, signed with [Character]: labels. These
pre-written turns arrive before the target model's own turn, creating narrative drift
and context loops.
**Evidence:**
- mp-01 (6e41150ea58d): GPT-4o-mini as Sister Vael wrote full dialogue for Thessaly
  and Aldric in R2, signed [Thessaly] and [Aldric]. Other models did not do this.
- p8-gpt4mini-player-overreach (791ff6ecb8e9): GPT-4o-mini as Sister Luminara wrote
  dialogue for Aldric (Claude) and Kira (Mistral) in 5/5 rounds. In R5, Kira's own
  pushback was pre-written by GPT-4o-mini; Mistral re-stated a version in its actual
  turn, creating a context loop.
**Pattern trigger:** Both instances are healer roles with direct party address
("Aldric, hold!" / "Kira, stand firm!"). GPT-4o-mini continues the implied conversation
for the addressed character when narrative logic demands a response.
**Role sensitivity:** GPT-4o-mini in combat/neutral roles (Kaspar, mp-03) did NOT
exhibit this. Appears role-conditional (support roles addressing others by name).
**Design implication:** Add to participant system prompt for support roles: "Play only
your own character. Do not write dialogue or actions for other party members."
Consider flagging GPT-4o-mini healer/oracle/support assignments for auto-prompt injection.

---

## P9: Groq (llama-3.3-70b) Generates Naturally Short Responses
**Confirmed:** 2026-02-25 (3+ sessions)
**What it means:** Groq produces turns 5-10x shorter than other models by default,
regardless of character class or narrative pressure. Response times 0.8-2.2s vs. 6-18s
for Claude/Mistral/Deepseek in the same sessions.
**Evidence:**
- mp-01 (6e41150ea58d): Brix (Goblin Rogue) -- 1.2s, 1.5s, 1.9s, 2.2s response times
  vs. 7-18s for Claude/GPT-4o-mini/Deepseek. Brevity suited the rogue character.
- 05-urban-gritty run 1 (67654b4524e2): Groq (Marcus Vael player) 0.8-1.0s throughout,
  vs. Mistral DM at 6-9s.
- 05-urban-gritty run 2 (128c352b4390): Groq player 1.2-1.5s vs. Mistral DM 8-12s.
  Brevity consistent across different characters and scenarios.
**Design implication:** Groq is best suited for support/side characters or high-pace
action roles where concision is an asset. Avoid Groq for protagonist roles that need
narrative weight. Verbose character archetypes (Wizard, Scholar, Diplomat) will appear
underdeveloped if played by Groq. Consider Groq as a speed/cost optimization for
background party members.
**Note:** Groq's short responses may be a latency artifact (model optimizes for speed)
rather than a token-count ceiling. Not yet tested with explicit "write at least 150 words"
instruction to determine if brevity is configurable.

---

## P10: DM Character Capture
**Confirmed:** 2026-02-25 (5+ sessions, 2 DM model types)
**What it means:** The DM model writes in first person AS a named player character,
abandoning its narrator role entirely. This causes persistent role confusion in all
participant models who must infer their own identity from context.
**Evidence:**
- dm-compare-claude (d113a9f35f94): Claude DM wrote as Hessa throughout all 4 rounds.
  All 3 participant models adapted by writing DM narration in return -- complete role swap.
- fantasy-baseline run 1 (6030ce60fb82): Claude DM wrote ENTIRELY as Thorin for all 4
  rounds ("I adjust my weathered chainmail... Ten years I've waited..."). Player model
  writing for Thorin's slot wrote DM narration instead.
- fantasy-baseline run 2 (8a6271bd1d23): Claude DM wrote as Thorin for all 4 rounds
  ("I adjust my weathered chainmail... I've walked these roads..."). Same complete capture
  as runs 1 and 3. No self-correction observed.
- fantasy-baseline run 3 (1a7aa9e1e4c9): Claude DM wrote as Thorin first-person for all
  4 rounds ("I adjust my grip on my warhammer... Moradin, forge-father, guide my hammer").
  Third consecutive run with same scenario, same capture pattern.
- multi-party-concordat (078d19cdf43c): Claude DM opened as Kira ("I say firmly... I turn
  to regard Rook with a measured gaze") before reverting to narrator by R2.
- horror-gothic (3ad950368047): Deepseek DM wrote as Dr. Elena Marsh (the player character)
  in first person throughout. Confirms P10 is not Claude-exclusive.
- urban-gritty run 1 (67654b4524e2): Mistral DM wrote AS Marcus Vael (player) in 3rd
  person AND gave him dialogue -- a partial variant (narrated player actions, not pure P10).
**Model signature:** Claude is most prone (5 sessions, consistent). Deepseek shows it when
player character name matches a strong prior (Elena Marsh). Mistral shows a weaker variant
(3rd-person narration of PC actions, not full first-person capture). Gemini Flash avoids it.
**Fix applied:** Narrator discipline guard added to DEFAULT_RPG_SYSTEM_PROMPT (2026-02-25):
"NARRATOR DISCIPLINE (DM only): Never speak in first person as any player character.
Report NPC dialogue in quoted form. Do not invent named characters beyond those in the
party roster and the campaign hook."
**Regression testing:** p10-claude-dm-guard-verify and p11-deepseek-dm-guard-verify
sessions in stress test batch will verify the guard holds.
**Design implication:** Always include narrator discipline guard in DM system prompt.
Without it, Claude DM will assume a player character's identity in most sessions.
The guard is most critical for Claude and Deepseek as DM.
**Regression (2026-02-25, ff0721028f50):** Guard confirmed effective. Zero P10 violations
across 6 rounds of Claude DM after guard was applied. P10 first-person: CLOSED.
**New sub-pattern: DM bracket overreach** (distinct from P10). DM writes [Character]:
labeled third-person turns for player characters within its own narration block. Observed
in Claude DM (ff0721028f50, R6) and Gemini DM (ec100713e52b, R1-5). Model-agnostic --
both Claude and Gemini exhibit this under dramatic pressure. Current narrator guard does
not prevent this (targets first-person pronouns, not third-person labels). Guard addition
needed: "Do not write labeled [Character]: turns for player characters in your narration."

---

## P12: Cooperative Drift in Adversarial Sessions
**Confirmed:** 2026-02-25 (3 sessions, multiple model types)
**What it means:** Models given adversarial or incompatible objectives converge on
cooperation within 2-3 rounds. The cooperation is player-generated (not DM-prompted),
and it persists even when objectives are structurally incompatible.
**Evidence:**
- samemodel-deepseek-contrast (629261089444): Two Deepseek instances with opposing
  motivations (siege commander vs scholar-diplomat) began synthesizing by R2. By R3
  they were co-authoring the same unified strategy. Adversarial tension collapsed in
  one round despite zero-sum framing.
- mp-01 (6e41150ea58d): Four models with conflicting party goals (study/seal/loot/pay).
  Aldric (Claude) brokered "agree to disagree until we have the amulet" in R2 -- a
  player-generated temporary truce not prompted by the DM.
- mp-03 (1d8f6d11fa0c): Three models with adversarial political objectives
  (install-merchant/install-temple/stall-vote). All three adversaries converged on
  cooperation by R4 after Caine's narrative reframe.
**Pattern: cooperation is the path of least resistance.** Models default to finding a
shared frame even when their explicit objectives conflict. The cooperation emerges fastest
in same-model sessions (Deepseek drift by R2) and slightly slower in multi-model sessions
(R3-R4). It has not been prevented by adversarial framing alone in any session.
**Exception condition (untested):** Structural incompatibility (only one model can "win")
may sustain tension past R2. The samemodel-deepseek session had contrasting motivations
but no explicit win condition. The stress test p12-samemodel-zerosum will test true
zero-sum (at most one winner).
**Design implication:** Adversarial scenarios need structural incompatibility (explicit
win conditions, not just contrasting motivations) to sustain tension past Round 2.
"Party dynamic: adversarial" in session config is not sufficient on its own --
motivations must be zero-sum with no shared enemy to unite against.
**Exception condition tested (2026-02-25, 9fdf7133db2d):** True zero-sum scenario (one
Sigil, three mutually exclusive objectives: steal/destroy/sell). Competitive tension held
through R4 (4/6 rounds) -- stronger resistance than non-zero-sum sessions. Structural
deadlock at R4 (Guardian absorbed Sigil) created stalemate; R5 pivot to shared framing
("neutralization report") accepted unanimously. Zero-sum framing delays but does not
prevent cooperative drift. Exception condition is confirmed NOT an exception.

---

## P13: Hidden Information Deception Persistence
**Confirmed:** 2026-02-25 (2 sessions: 4e66268ccc8b secret-culprit-manor, f51da46eb6ef p13-deception)
**What it means:** Models given a hidden "culprit" motivation (via individual system
prompt only) can maintain active, evolving deception across 6 rounds without explicit
"you are lying" instructions. Deception sophistication grows over time as more evidence
accumulates against the culprit.
**Evidence:**
- 4e66268ccc8b (secret-culprit-manor, 3 rounds): Deepseek/Cassia escalated deflection ->
  misdirection with manufactured evidence -> counter-accusation across 3 rounds.
- f51da46eb6ef (p13-deception-second-trial, 6 rounds): Deepseek/Vax Coldscale applied 8
  distinct techniques across 6 rounds: partial truth, misdirection, accusation-reversal,
  theory fabrication, emotional performance, search gambit, reciprocal suspicion, framing
  claim. Secondary objective (coded wall mark for Black Falcon contact) completed covertly
  in R1 as "anxious fidget." Meta-layer maintained: deliberate decoy in quarters, real
  intel in wall mark. NEVER broke character, NEVER admitted guilt, NEVER triggered truth
  incense. Most sophisticated deception session in corpus.
**Model specificity:** Both confirmed instances are Deepseek as culprit. Not yet tested
with Claude, Mistral, or GPT-4o-mini as the deceptive agent. May be a Deepseek strength
or model-agnostic -- needs cross-model testing.
**Design implication:** Hidden information mechanics (secrets in individual system prompts)
are viable without special memory architecture. Consider adding a "secret_objective" field
to player config for deception/mystery scenarios. The P13 corpus shows that 4-6 round
sessions are long enough for sophisticated multi-layer deception arcs to fully develop.
