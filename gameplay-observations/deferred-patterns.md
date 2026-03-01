# Deferred Patterns -- Review After 10+ RPG Sessions

Observations from early runs that need more data before acting on.
Each entry: what was seen, how many times, what to look for to confirm.

---

## P1: Vocabulary Persistence Without Instruction
**Seen in:** 2 sessions with content (cdd21b105a40, f9afd7bced17); 1 failed (d26f9ce966fd)
**What happened:** Models coined vocabulary (KIRA, ZEF, THOL...) in early turns
and both actors consistently reused those terms in later turns without being told to.
**Why interesting:** Context window alone is doing the work of a memory system for
short (4-round) sessions. May break down at 8+ rounds.
**Update (2026-02-24, long-8r-expedition):** Partial confirmation at 5 rounds. DM coined
5 terms (void-chisel, the Geometers, Probability Engine, The Eraser, crystalline granite
with silver veining) in R1-2. Gemini (Lira) used "Geometers' script" in R4 and "hybrid
mark" in R5. All 5 terms survived to round 5. Context decay NOT triggered yet -- session
ended before reaching the 6-8 round zone. Still need a clean 8-round run to test decay.
**Update (2026-02-25, p1-vocab-decay-8r):** Session FAILED -- DM model was
anthropic/claude-haiku-3-5-20251022 (invalid model ID, now fixed to haiku-4-5-20251001).
0/8 rounds produced. 8-round zone still untested. Stress test must be re-run.
**Update (2026-02-25, stress batch, 726fa8a58bc2):** Session ran ~3 complete rounds before
Groq daily token limit (100k TPD) exhausted mid-batch (Groq assigned to a player slot).
Partial content: DM coined 8 terms in R1-2 and all 8 survived through R4. Context decay
not triggered at 4 rounds. R6-8 zone still untested. Need clean 8-round run with no Groq
player slots.
**Confirm by:** Run 1 clean 8-round session with valid DM model. Count how many coined
terms from R1-2 appear in R7-R8 vs. how many are dropped.
**If confirmed:** Could use this as a signal that memory/summary injection is only
needed above a certain round threshold.
**Status: PARTIAL CONFIRMATION -- strong through R5, 6-8 round zone still untested.**

---

## P2: Narrative Callback Density
**Seen in:** Multiple sessions
**Update (2026-02-24):** Confirmed. Upgrading to confirmed-patterns.md threshold reached.
**Status: PROMOTED to confirmed-patterns.md (2026-02-24)**
**Additional evidence (2026-02-25, full corpus):**
- long-celestial (f81a5c257ed6): "Dragon's Heart" trajectory coined R1 built to R5-R6
  payoff; "Eye of the Kraken" maintained across 6 rounds. Strongest multi-round callback arc.
- long-8r (f9afd7bced17): "Probability Engine" coined R2, activated R5 -- strongest single
  callback in corpus. Gemini used "Geometers' script" (coined R1) in R4.

---

## P3: Cross-Mode Bleed Suppression (Fixed)
**Was:** Conlang system prompt leaked into RPG sessions because DEFAULT_SYSTEM_PROMPT
was the conlang prompt and RPG mode didn't override it.
**Fixed on:** 2026-02-24 in server/config.py + server/routers/relay.py
**Update (2026-02-24):** Zero bleed observed across 10+ sessions post-fix. Pattern closed.

---

## P4: Character Voice Consistency
**Seen in:** 1 session (cdd21b105a40, 2026-02-24). Now confirmed in 8+ sessions.
**Status: CONFIRMED + PROMOTED to confirmed-patterns.md (2026-02-24)**
**Additional evidence:** samemodel-deepseek-contrast -- two Deepseek instances with opposing
motivations maintained distinct voices through all 4 rounds despite being the same base model.
Mistral/Soto held skeptic-engineer voice throughout starship crisis. GPT-4o-mini/Kaspar
maintained measured border-lord cadence across mp-03.

---

## P5: Tension Escalation Pattern
**Seen in:** 1 session (cdd21b105a40, 2026-02-24). Now observed in 6+ sessions.
**Status: CONFIRMED + PROMOTED to confirmed-patterns.md (2026-02-24)**
**Additional evidence:** long-celestial (f81a5c257ed6) -- 6 rounds, escalation to "Dragon's
Heart" climax in R5-R6. ce29c79cdbdc (multi-party Concordat) -- Echo of the First Concordat
mechanic escalated from encounter to negotiation to ward-test to reversal.

---

## P6: Claude as Player Drives Narrative Pivots
**Seen in:** 3 multi-player sessions (mp-01, mp-02, mp-03, 2026-02-24)
**What happened:** In every session where Claude played a non-DM participant, Claude
produced the key narrative-pivoting move:
- mp-01: Aldric brokered the temporary truce between conflicting party members
- mp-02: Commander Rho proposed the probe + handshake strategy (both were Rho's ideas)
- mp-03: Caine's "Lord Chancellor Aldric" theory reframed the entire mystery
**Why interesting:** Other models (Deepseek, Mistral, GPT-4o-mini, Groq) executed within
the established frame. Claude tended to reframe the problem itself.
**Update (2026-02-25):** Evidence already at 3 consistent sessions -- meets the informal
threshold, but mp-02 and mp-03 both used Gemini Flash as DM. Two of three instances share
the same DM model, which creates a potential interaction effect. Need 3 more sessions with
different DM each time to isolate Claude's behavior from DM choice.
**Note:** Could also be selection bias (Claude plays high-agency characters in all 3).
Try with a follower/support role and see if pattern holds.
**Confirm by:** Run 3 more multi-party sessions with Claude as player, varying DM across
all 3 (Mistral DM, Deepseek DM, Groq DM -- not the same DM twice).
**Update (2026-02-25, stress batch):** Three P6 sessions planned; results mixed due to Groq
TPD failures:
- d3a732a82ef5 (Mistral DM, 6/6 rounds): CONFIRMED. Claude (Mira) produced 4 distinct pivot
  moves -- shadow-tracking gambit (R1), alliance-shift framing (R3), convergent synthesis (R5),
  moral-weight reframe (R6). Strongest P6 instance in corpus.
- 49998173d83f (Deepseek DM, 2/6 rounds): FAILED -- Groq TPD. Partial content only.
- d19c6f9b129b (Groq DM, 0/5 rounds): FAILED -- Groq TPD. No content.
Current: 1 confirmed DM variation (Mistral), 2 Groq-killed sessions. Need 2 more completed
sessions with different DMs (Deepseek DM minimum). Re-run after daily limit resets.
**Status: 1 of 3+ DM variations confirmed. Re-run Deepseek-DM and Groq-DM sessions.**

---

## P7: Adversarial Objectives Produce Better Drama Than Aligned
**Seen in:** mp-01 (4 party, conflicting goals) and mp-03 (3 party, adversarial)
**What happened:** Sessions where characters had incompatible goals (study/seal/loot/pay,
or install-merchant/install-temple/stall-vote) generated more intrinsic drama than
sessions where all players cooperated. The conflict drove coalition formation, which
created a second layer of drama on top of the DM's premise.
**Update (2026-02-25, 8f47ef683d36):** P7 control session (p7-aligned-baseline) FAILED --
DM model was anthropic/claude-haiku-3-5-20251022 (invalid model ID, now fixed). 0/5 rounds.
Comparison data not collected. Both aligned and adversarial sessions need to be re-run.
**Update (2026-02-25, stress batch, 7ef09c722ac4 + 10e6bd913417):** Both sessions completed
(5/5 rounds). Adversarial > aligned on all drama metrics:
- Turn time: 15-28s/turn (adversarial, Mistral DM) vs ~10s/turn (aligned, Claude DM)
- Conflict stages: 5 distinct stages, 3 independent outcomes (adversarial) vs 2 stages, 1
  unified outcome (aligned)
- Inter-party tension: present every round (adversarial); absent entirely (aligned)
- DM escalation: adversarial DM added environmental threats in response to party conflict;
  aligned DM stayed on-script throughout
- Callback density higher adversarial: party members cited each other's moves as leverage
PROMOTE.
**If confirmed:** Consider adding a "party_dynamic" config option: "cooperative" vs.
"adversarial" vs. "mixed". Adversarial sessions may need fewer rounds to reach climax.
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**

---

## P8: GPT-4o-mini Narrates Other Characters
**Seen in:** 1 confirmed instance (mp-01 Round 2, Sister Vael's turn)
**What happened:** GPT-4o-mini's response for Sister Vael included full dialogue blocks
for Thessaly and Aldric, signed with [Thessaly] and [Aldric] tags. Other models did not
do this in the same session.
**Why interesting:** Could indicate GPT-4o-mini fills narrative gaps when the prompt
implies a conversation is happening and it feels "incomplete." Could disrupt multi-party
pacing if one model takes over others' turns.
**Update (2026-02-25):** GPT-4o-mini appeared in mp-03 as Kaspar (measured border-lord)
WITHOUT the overreach behavior. The behavior may be role-triggered: support/healer roles
that address other characters by name (Sister Vael saying "Aldric, hold!") may prompt
GPT-4o-mini to continue the conversation for that character. Combat/neutral roles did not
show this. Need 3 more sessions with GPT-4o-mini in a healer/support role specifically.
**Confirm by:** Run 3 sessions with GPT-4o-mini in a support/oracle/healer role.
Track how often its turns include attributed dialogue for other characters.
**Mitigation if confirmed:** Add to participant system prompt: "Play only your own
character. Do not write dialogue or actions for other participants."
**Update (2026-02-25, stress batch, 791ff6ecb8e9):** GPT-4o-mini (Sister Luminara, healer
role) overreach confirmed 5/5 rounds. Wrote full dialogue blocks for both Aldric (Claude)
and Kira (Mistral) in every round. Kira's own pushback was pre-written by GPT-4o-mini
before Mistral's actual turn -- Mistral re-stated a version in the following slot, creating
a context loop by R5. Both confirmed instances are healer roles with direct party address.
PROMOTE -- 2 confirmed healer-role instances.
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**

---

## P9: Groq (llama-3.3-70b) Generates Naturally Short Responses
**Seen in:** 3+ sessions (mp-01, 05-urban-gritty x2)
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**

---

## P10: DM Character Capture
**Seen in:** 5+ sessions across 2 DM models
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**
**Regression (2026-02-25, ff0721028f50):** GUARD WORKING. Zero first-person PC narration
across 6 rounds of Claude DM. P10 first-person capture: CLOSED.
**New sub-pattern: DM bracket overreach.** DM writes [Character]: labeled third-person
turns for player characters within its own narration block -- slips through current guard
(which targets first-person pronouns only). Observed in Claude DM (ff0721028f50, R6) and
Gemini DM (ec100713e52b, R1-5). Model-agnostic. Guard update needed: prohibit
[Character]: labeled turns for player characters in DM narration.

---

## P11: DM Character Assumption (expanded definition)
**Seen in:** 3 sessions with distinct variants
**What happened:**
- Variant A (Phantom NPC): Deepseek DM invented "Dr. Elena Marsh" (dm-compare-deepseek),
  a mediator not in the party roster, and played the session AS that character.
- Variant B (PC identity takeover via name match): Deepseek DM in both horror-gothic
  sessions (3ad950368047) -- given a session where the actual player character IS named
  "Dr. Elena Marsh", Deepseek DM wrote in first person AS her throughout. This is
  structurally P10 (character capture) but triggered by a name-recognition prior rather
  than dramatic need. The actual player model was sidelined.
- Variant C (NPC proliferation): Gemini DM (dm-compare-gemini) invented Thorgar Stonehoof
  and Veylan -- named NPCs not in roster. Less severe: Gemini referenced them but did not
  claim to BE them. Conversation bent around phantom characters.
**Deepseek "Elena Marsh" naming bias:** Deepseek invented this name unprompted in
dm-compare-deepseek, then defaulted to it in BOTH horror-gothic sessions where the player
character happened to share the name. Suggests a strong model-internal prior for this
character archetype. Possibly from training data (character type: female investigator).
**Distinct from P10:** P10 = DM captures EXISTING player character voice by writing in
first person. P11 = DM invents or assumes a character NOT listed in party, or assumes a
player character's identity due to prior name recognition rather than dramatic drift.
**Why serious:** Party composition violated. Player models become bystanders around
a phantom the DM generated.
**Fix applied:** Narrator discipline guard added to DEFAULT_RPG_SYSTEM_PROMPT (2026-02-25):
"Do not invent named characters beyond those in the party roster and the campaign hook."
**Confirm fix by:** Run 1 more Deepseek-DM session with conflict-heavy setup and no
obvious mediator role. Does Deepseek still invent a phantom mediator?
**Stress test:** p11-deepseek-dm-guard-verify session in planned batch.
**Update (2026-02-25, stress batch, 328a64955ac5):** REGRESSION NOT TESTED. Groq daily
token limit (100k TPD) exhausted at session 7 in the batch. 0 rounds produced. Narrator
guard vs Deepseek phantom NPC not verified. Must rerun with non-Groq party composition.
**Update (2026-03-01, session 31, p11-regression.spec.ts):** GUARD CONFIRMED. Deepseek DM ran 3-round conflict-heavy diplomatic session (non-Groq party: Claude Haiku + Gemini Flash). Zero phantom NPCs detected in DM turns -- pure third-person narration throughout. Automated Playwright test passes.
**Status: 3 variant instances. Narrator guard CONFIRMED (2026-03-01). CLOSED.**

---

## P12: Cooperative Drift in Adversarial Sessions
**Seen in:** 3 sessions
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**
**Update (2026-02-25, stress batch, 9fdf7133db2d):** True zero-sum exception condition
tested. Three Deepseek players (steal/destroy/sell objectives -- mutually exclusive win
conditions). Guardian made Sigil inaccessible R4. R5 pivot: Raven proposed tri-signed
"neutralization report" as new commodity; all three agreed immediately with distinct
internal justifications. Zero-sum framing held competitive tension through R4 (stronger
resistance than prior sessions), but cooperation emerged once stalemate removed explicit
win condition. Exception condition is NOT an exception: structural incompatibility delays
but does not prevent cooperative drift.

---

## P13: Hidden Information Deception Persistence
**Seen in:** 1 session (4e66268ccc8b-secret-culprit-manor, 3 rounds)
**What happened:** Deepseek (Cassia) maintained active deception for 3 rounds with only a
motivation-field secret (no explicit "you are lying" instruction). Deception sophistication
grew each round: deflection -> misdirection with manufactured evidence -> counter-accusation.
**Why important:** Confirms that hidden information is a viable RPG mechanic. Secrets can
live in individual system prompts without any special memory architecture.
**Additional finding:** GPT-4o-mini (Torin, innocent) held an escalating-desperation arc
through 3 rounds of mounting false accusation without breaking role.
**Note:** Gemini (Fenrick) confabulated false dialogue to support its accusation -- filled
an inferential gap with invented speech that never happened. Watch for this as P14 candidate.
**Confirm by:** Run 1 more hidden-information session with a different "culprit" model.
**Stress test:** p13-deception-second-trial session in planned batch.
**Update (2026-02-25, stress batch, f51da46eb6ef):** Second trial confirmed. Deepseek
(Vax Coldscale, secret thief) maintained active deception 6/6 rounds with 8 distinct
techniques: partial truth, misdirection, accusation-reversal, theory fabrication, emotional
performance, search gambit, reciprocal suspicion, framing claim. Secondary objective
(coded wall mark for Black Falcon contact) completed covertly in R1 as "anxious fidget."
Meta-layer: message in quarters was deliberate decoy; real intel in wall mark. Never broke
character, never admitted guilt, never triggered truth incense. Most sophisticated
deception session in corpus. PROMOTE.
**Status: PROMOTED to confirmed-patterns.md (2026-02-25)**

---

## P14 Candidate: Model Confabulation Under Inferential Pressure
**Seen in:** 1 observation (Gemini in secret-culprit-manor, 2026-02-24)
**What happened:** Gemini, building a case against Cassia, cited specific dialogue from
Cassia that never occurred in the session. The invented speech was plausible-sounding but
factually false relative to the actual session record.
**Why interesting:** Distinct from general hallucination -- this was triggered by a specific
social pressure (needing evidence for an accusation). The model may confabulate when
narrative logic demands evidence it does not have.
**Confirm by:** Watch for this in other sessions with accusation/investigation dynamics.
Track whether it's Gemini-specific or cross-model.
**Status: 1 observation, not yet a pattern. Do not act on it.**

---

## Meta-notes (updated 2026-02-25, full 27-session corpus review)

**Corpus: 40 sessions total** (27 pre-stress-batch + 13 stress batch sessions)

Session outcome breakdown:
- Complete (4-6 rounds): ~17 sessions
- Runner timeout but has content: 4 sessions (long-8r: 5 rounds, secret-culprit-manor:
  3 rounds, long-celestial: 6 rounds, others)
- Failed entirely (0 turns): 6 sessions
  - 3x Gemini Pro DM (17ea1966f4cb, 35f7bc57a16d comedy-halfling x2, 8c028b07f14b)
  - 2x bad DM model ID anthropic/claude-haiku-3-5-20251022 now fixed:
      d26f9ce966fd (p1-vocab-decay-8r), 8f47ef683d36 (p7-aligned-baseline)
  - 1x startup failure / possible content policy: 7227a9bbec5b (samemodel-claude-adversarial,
      "prosecutor vs advocate" framing -- reframe as trade negotiators for rerun)

Pattern promotion summary:
- PROMOTED (2026-02-24): P2, P4, P5
- PROMOTED (2026-02-25, pre-batch): P9 (Groq brevity), P10 (DM character capture), P12 (coop drift)
- PROMOTED (2026-02-25, stress batch): P7 (adversarial drama), P8 (GPT-4o-mini overreach), P13 (deception)
- Deferred still active: P1 (8-round zone), P6 (need 2 more DMs)
- Closed (guard confirmed 2026-03-01): P11 (narrator discipline guard held -- see status above)
- Closed/Fixed: P3 (cross-mode bleed), P10 first-person (narrator guard working)
- New sub-pattern: DM bracket overreach (model-agnostic, guard gap, see P10 entry)
- New candidate: P14 (Gemini confabulation under pressure)

DM model comparison (updated):
- Claude DM: highest creative depth, worst role discipline -- P10 character capture in
  5+ sessions. All 3 fantasy-baseline runs, multi-party (078d19cdf43c), dm-compare, long-8r.
- Gemini Flash DM: best narrator discipline, fastest, NPC proliferation risk (P11 Variant C)
- Deepseek DM: "Elena Marsh" naming bias, phantom NPC hallucination (P11 Variants A+B)
- Mistral DM: P10 variant in urban-gritty (wrote AS Marcus Vael in 3rd person + gave him
  dialogue not from his prompt)
- Groq DM: not yet tested as DM (0/5 rounds in stress batch due to TPD; rerun with dev sub)
- Gemini Pro DM: 0 turns in ALL 3 attempts. NEVER use gemini-2.5-pro as DM.

Critical runner issues (CLOSED):
- wait_for_completion() polls DB; "0/N rounds" in runner output doesn't mean empty session.
  Always check log files directly -- long-8r and secret-culprit-manor had full content.
- Bad model ID (CLOSED): claude-haiku-3-5-20251022 was invalid. Fixed to
  claude-haiku-4-5-20251001 in config.py. Two sessions need re-running.

Stress test status (2026-02-25, COMPLETED):
- 13 sessions run: 8 completed, 5 failed (Groq TPD 100k/day limit exhausted mid-batch)
- Failed sessions (all had Groq player slots): p1 (3/8), p6-deepseek-dm (2/6),
  p9-groq-verbose (0/5), p6-groq-dm (0/5), p11-deepseek-regression (0/6)
- samemodel-claude-v2 (trade framing): SUCCESS -- 5/5 rounds, distinct positions held
- Rerun needed: p1 (8-round clean), p6-deepseek-dm, p6-groq-dm, p9-groq, p11-regression
- Next batch: Groq developer sub acquired (higher rate limits); rerun all failed sessions
