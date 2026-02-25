# RPG Context Management — Design Notes

**Created:** 2026-02-24
**Status:** Design phase. No implementation yet.
**Related corpus evidence:** long-8r-expedition (P1 partial confirm), deferred-patterns.md

---

## The Problem

Two distinct failure modes in long (8+ round) RPG sessions:

1. **Token overflow** — context window fills with turn history. At R15 with 4 players:
   ~75 turns x ~200 tokens = 15,000 tokens of history + system prompts. Modern models
   (128k+) don't hit hard overflow, but it becomes real for verbose models or 20+ rounds.

2. **Attention degradation ("Lost in the Middle")** — even within the context window,
   transformers don't attend uniformly. Content from distant past (turns 1-3) is
   deprioritized vs. recent context. By R12, R3's story decisions may be in the
   forgotten middle zone. This is the real problem for RPG continuity.

**Corpus evidence:** Long-8r session showed strong term maintenance through R5 (5 coined
terms survived). The 6-8 round zone is untested. R10+ is the unknown danger zone.

---

## Solution Taxonomy

### Option A: Sliding Window
Pass only last N rounds to each participant. Everything older is dropped.
- **Best case:** High-chaos social scenes where only immediate vibe matters
- **Fatal flaw:** Mystery/progression RPGs break. Item found in R2 is gone by R10.
- **Verdict:** Only viable as a fallback, never primary strategy.

### Option B: Rolling Summary
After every K rounds, LLM call: "Summarize this session in 150 words."
Prepend as a "PREVIOUSLY..." block.
- **Best case:** Narrative continuity. Keeps story vibe. Prevents hallucinated plot.
- **Critical vulnerability:** Lossy compression smooths out conflict. "Cassia was
  suspicious" may compress to "the party is wary," losing the specific mechanical
  leverage of the nightbell extract or the manufactured herbalist kit evidence.
- **Verdict:** Good for tone/arc preservation. Bad for precise mechanical facts.

### Option C: Structured State Extraction
After each round, LLM extraction pass -> structured JSON with NPCs, decisions, items,
coined terms, open threads. Inject as WORLD STATE block.
- **Best case:** "Save game" precision. Probability Engine never forgotten.
- **Critical vulnerability:** Extraction latency every round slows UX. If extraction
  model misses a detail once, that detail is deleted from the world's DNA.
- **Verdict:** Right long-term answer for DM memory. Overkill for player memory.

### Option D: Layered Context (Hot + Cold + Frozen)
Three context layers per LLM call:

| Layer | Content | Tokens | Update Frequency |
|-------|---------|--------|-----------------|
| Frozen | Session bible: party roster, world lore, initial hook | ~500 | Never |
| Cold | Compressed summary of rounds 1..(current-4) | ~200 | Every 2 rounds |
| Hot | Full text of last 4 rounds | ~800-1200 | Every round |

- **Best case:** Mimics human memory (sensory -> short-term -> long-term).
  Industry standard for production-grade agents.
- **Critical vulnerability:** Requires a Context Orchestrator. Buffers can overlap
  or contradict if not carefully managed.
- **Verdict:** The target architecture. Build toward this incrementally.

### Option E: Per-Role Memory (DM != Player)
Separate summary passes for DM (world state, NPC inventory, plot threads) and
each player (their arc, what they personally witnessed, current goals).
- **Best case:** Solves the omniscience problem. Players can't metagame DM-only info.
  DM stays focused on orchestration.
- **Critical vulnerability:** N+1 summary calls instead of 1. Token costs and API
  latency scale with party size.
- **Verdict:** High value for hidden-information scenarios (confirmed viable in
  secret-culprit-manor). Phase 3+ territory.

---

## Extended Architecture (Phase 4+)

### Vector RAG / "Lore Graveyard"
Store every round in a vector database (ChromaDB or Pinecone). When a participant's
current prompt contains "The Geometers", RAG pulls the R1 Geometers description into
hot context automatically -- even if it wasn't in the rolling summary.

**Why this matters:** Handles "dormant" plot points that summaries prune. A mystery
item introduced in R3 and not mentioned again until R14 would survive in a RAG store
even if it was dropped from all summaries.

**Complexity cost:** Requires running an embedding model + vector DB. Significant
infra addition.

### Semantic Triggering (Event-Driven Updates)
Instead of updating summary every K rounds (time-based), update on narrative milestones.
Small classifier monitors for state-change events: [NEW_NPC], [ITEM_ACQUIRED],
[LOCATION_CHANGE], [DECISION_MADE].

**Why this matters:** A 4-round window might capture 3 rounds of banter and 1 round
of world-shifting revelation. Time-based summaries capture equal density regardless of
importance. Event-driven summaries are always "dense" with meaningful information.

**Implementation note:** Could be a regex + small model hybrid. Regex catches
proper nouns and capitalized terms; small model classifies whether they're new.

### Coined Term Reflection Loop / "Auto-Bible"
When DM (or player) uses a capitalized Proper Noun not in the Frozen context, a
background task adds it to a Dynamic Glossary that is always injected.

**Why this matters:** Turns the Frozen context into a living document that writes
itself during play. The Geometers, Probability Engine, void-chisel would auto-populate
after first use -- never depending on context recall again.

**Implementation:** Regex scan of each DM turn for CamelCase or ALL_CAPS terms.
Background task (asyncio.create_task) calls a small model: "Define this term in
10 words based on how it was used." Appended to session glossary in DB.

---

## Recommended Implementation Path

### Phase 1: Pre-Flight Injector + Layered Context (MVP)

Define the SessionState schema:
```python
@dataclass
class SessionState:
    summary: str = ""           # rolling narrative summary (~150 tokens)
    glossary: dict = field(default_factory=dict)  # coined terms -> definitions
    flags: dict = field(default_factory=dict)     # named boolean events
    last_updated_round: int = 0
```

The "Pre-Flight" injector assembles context for each LLM call:
```
[SYSTEM PROMPT: Who am I?]
[GLOSSARY: What is the world? -- coined terms, always injected]
[SUMMARY: What happened before? -- rounds 1..(current-4)]
[HOT CONTEXT: What is happening now? -- last 4 rounds full text]
```

**Token budget management:** Count tokens before each call. If hot context would
overflow the budget, trim from the oldest hot turns first (never trim frozen or summary).

### Phase 2: Coined Term Auto-Extraction

After each DM turn, regex scan for capitalized proper nouns not in existing glossary.
Background task: call a fast model (Haiku, Gemini Flash) with:
"In one sentence, define: '{term}' based on this context: '{snippet}'"

Add to session glossary in DB. Inject glossary in every subsequent Pre-Flight call.

This directly addresses P1's open question -- ensures terms survive regardless of
attention degradation.

### Phase 3: Per-Role Memory for Hidden Information

For hidden-information scenarios (secret-culprit, mystery, intrigue):
- DM context: full world state including ground truth secrets
- Player context: only what their character knows + what was publicly stated

This leverages P13 (deception holds 3+ rounds) by ensuring the deceiving model
never sees contradicting information in its own context.

### Phase 4: Event-Driven Updates + RAG (if Phase 1-3 prove insufficient)

Implement only if 8+ round sessions show significant degradation despite Phase 1-3.
RAG infra is expensive to maintain; exhaust simpler approaches first.

---

## Files to Modify (When Ready to Implement Phase 1)

| File | Change |
|------|--------|
| `server/rpg_engine.py` | Add `SessionState` dataclass; add `build_preflight_context()` function; call summary update every K rounds |
| `server/db.py` | Add `session_state` column to experiments table (JSON text); getter/setter methods |
| `server/routers/relay.py` | Pass `memory_interval` from rpg_config (default: 4) |
| `ui/src/api/types.ts` | Add `memory_interval?` to RpgConfig |
| `ui/src/pages/Campaign.tsx` | Optional: expose memory_interval slider in advanced settings |

---

## Open Questions

1. **Which model for summary extraction?** Haiku is cheap + fast. Gemini Flash is
   reliable for structured output. Deepseek tends to over-compress. Test all three.

2. **K value for summary trigger?** Every 4 rounds seems right for 15-round sessions.
   Every 2 rounds may be overkill (too many LLM calls). Configurable is best.

3. **Does the coined term loop create hallucination risk?** If the extraction model
   misdefines a term, that misdef propagates forever. Mitigation: show the DM the
   proposed definition and allow override. Or: only extract, never define (just show
   the raw term).

4. **Per-role memory for standard (non-hidden-info) sessions?** Probably overkill.
   The overhead of N+1 summary calls is only justified when information asymmetry
   matters to the game.
