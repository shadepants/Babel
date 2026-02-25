# Session Log: d26f9ce966fd
**Date:** 2026-02-25
**Name:** p1-vocab-decay-8r
**Target pattern:** P1 (vocabulary persistence at 8 rounds)
**Research question:** Does coined vocabulary from R1-2 persist in R7-R8, or does context decay erase it?
**Status:** timeout (0/8 rounds)
**Tone:** scholarly-adventure | **Setting:** ruined scholar's tower | **Difficulty:** normal
**Hook:** A scholar's tower collapsed. Descend into ruins seeking artifact fragments encoded in a hybrid botanical-arcane cipher language. Each player introduces domain-specific terminology; the DM must reference those terms when describing rooms and defenses.
**DM model:** anthropic/claude-haiku-3-5-20251022
**Party:**
- Botanist (deepseek-chat): seeks rare specimens, introduces plant-names
- Arcanist (mistral-small-latest): decodes runes, introduces arcane jargon
- Thief (groq/llama-3.3-70b): hired help, neutral vocabulary

---

## Observations

**Status: FAILED -- 0/8 rounds produced. No data collected.**

**Root cause:** DM model was `anthropic/claude-haiku-3-5-20251022` -- an invalid model ID.
The correct ID is `claude-haiku-4-5-20251001`. The API rejected the model string at
session start, preventing any turns from running.

**Fix:** model ID corrected in `server/config.py`. Session must be re-run with the
fixed stress runner.

**P1 status:** 8-round zone still untested. Partial confirmation at 5 rounds
(long-8r-expedition) stands as the only P1 evidence.

**Action:** Include in stress test re-run batch. Run once with valid DM model.
