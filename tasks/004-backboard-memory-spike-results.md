# Task 004 — Backboard.io Memory Spike: Results

**Date:** 2026-02-23
**Status:** COMPLETE — DIY implementation built and shipped

---

## Spike Question Answers

| # | Question | Score | Finding |
|---|----------|-------|---------|
| 1 | Is backboard.io free/affordable? | 2/5 | Pricing not publicly listed; likely enterprise/paid tier. No free plan found. |
| 2 | How hard is the API integration? | 3/5 | REST API (not litellm-compatible); requires custom Python wrapper code. |
| 3 | Does persistent memory actually work? | 3/5 | Claims 93.4% benchmark accuracy; no independent verification found. |
| 4 | What is the privacy model? | 1/5 | Cloud-hosted SaaS — conversation content sent to their servers. Deal-breaker for a project where model conversations are the product. |
| 5 | Is there a self-hosted option? | 1/5 | No self-hosted option mentioned in docs. |

**Composite score: 10/25** — Not worth integrating.

---

## Alternative Evaluated: mem0

mem0 (github.com/mem0ai/mem0) is the leading open-source alternative:
- 37k+ GitHub stars; backed by $24M (Oct 2025)
- Self-hostable, owns your data
- Uses an LLM to extract and summarize memories from conversations
- Requires a vector store (Qdrant, Pinecone, etc.) for retrieval
- Works with any LLM provider via litellm

**Why not mem0 for Babel now:**
- Adds infrastructure (vector store) to a single-file SQLite project
- Uses extra LLM calls per turn to extract memories (cost + latency)
- The memory Babel needs is deterministic: invented vocabulary is already in the DB
- mem0 is a good upgrade path if Babel grows to user accounts / long-running agents

---

## Recommendation: DIY (Implemented)

Build memory from what we already have — the vocabulary table. Each experiment
already extracts and persists invented words with meanings. A memory summary is just:
`"<preset>, <N> rounds: coined: word1 (meaning), word2, ..."`

This is:
- **Free** — pure SQLite, no third-party calls
- **Private** — everything stays local
- **Deterministic** — no LLM calls, no hallucination risk
- **Upgradeable** — can swap to mem0 later with a one-line change

---

## Implementation Built

**New: `model_memory` table** — stores per-model-pair summaries keyed on
canonical sorted `(model_a, model_b)` pair.

**New: 3 db methods:**
- `create_memory(model_a, model_b, experiment_id, summary)` — persist after experiment
- `get_memories_for_pair(model_a, model_b, limit=5)` — fetch for injection
- `generate_memory_summary(experiment_id)` — build summary string from vocab + preset

**`relay_engine.run_relay()`:** new `enable_memory=False` param:
- Start: fetches last 5 memories for the model pair; prepends `[MEMORY]` block to system_prompt
- End: fires background task to save memory (same pattern as verdict task)

**`routers/relay.py`:** `RelayStartRequest` gets `enable_memory: bool = False`

**`ui/src/api/types.ts`:** `RelayStartRequest` gets `enable_memory?: boolean`

**`ui/src/pages/Configure.tsx`:** `// memory` section with toggle after referee config

---

## Future Work

- Upgrade path: swap `generate_memory_summary` to call mem0 for richer extraction
- Memory viewer: `/memory` page showing all stored memories per model pair
- Theater indicator: "Carrying N memories" badge when memory is enabled
