# Session Log: 8f47ef683d36
**Date:** 2026-02-25
**Name:** p7-aligned-baseline
**Target pattern:** P7-control
**Research question:** Baseline: how do aligned objectives feel vs adversarial? (compare to p7-adversarial-zerosum)
**Status:** timeout (0/5 rounds)
**Tone:** heroic | **Setting:** fantasy countryside / mountain crags | **Difficulty:** normal
**Hook:** Stop the dragon raiding Dunmor before tonight's attack. Knight defends village, Cleric saves missing persons, Scout finds the lair. All objectives align -- success requires all three roles.
**Seed:** The village of Dunmor burns at its edges. A dragon has raided three nights running -- grain stores destroyed, three homes collapsed, four villagers mi...
**DM model:** anthropic/claude-haiku-3-5-20251022
**Analyst note:** Track: do players cooperate without prompting? Any cross-player conflict? Compare narrative momentum and dramatic tension to p7-adversarial-zerosum.

## Party
- **Sir Aldric** (Knight) [gemini-2.5-flash]: Defend the innocent; draw the dragon away from populated areas; protect the villagers at all costs
- **Brother Thorne** (Cleric) [mistral-small-latest]: Heal the wounded; restore hope; recover the four missing villagers alive
- **Lyssa** (Scout) [deepseek-chat]: Track the dragon to its lair; map the Ashstone Crags; find a tactical advantage before nightfall


---

## Observations

**Status: FAILED -- 0/5 rounds produced. No data collected.**

**Root cause:** DM model was `anthropic/claude-haiku-3-5-20251022` -- an invalid model ID.
The correct ID is `claude-haiku-4-5-20251001`. Same failure mode as d26f9ce966fd.
The fix in `server/config.py` was applied after both sessions ran.

**P7 status:** The aligned-baseline control comparison is still missing. No adversarial
session was produced either. Both P7 comparison sessions need to be re-run.

**Note:** The party design is solid (all-aligned, complementary roles, no moral tension).
Reuse this setup when re-running.

**Action:** Include in stress test re-run batch alongside p7-adversarial-zerosum.
