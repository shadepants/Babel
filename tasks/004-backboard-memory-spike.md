# Task 004 — Spike: Evaluate backboard.io for Persistent Debate Memory

**Status:** [ ] Not Started  
**Priority:** Low (Spike)  
**Source:** CLAUDE INSIGHT RESEARCH — C-007 (docs.backboard.io), C-008 (Reddit AI_Agents), report insights-2026-02-22-1.md  
**Added:** 2026-02-22

---

## Problem

Babel experiments are ephemeral. Each experiment starts fresh — models have no memory of previous experiments. Imagine a long-running "persistent debate" where Claude and Gemini carry grudges, build on past arguments, remember each other's rhetorical patterns. Today this is impossible. backboard.io claims a unified memory layer across LLM sessions with 93.4% benchmark performance.

This is a **spike** (time-boxed investigation), not a feature commitment. Goal is to answer: is backboard.io worth integrating?

## Spike Goal

In 2–4 hours, answer these questions:
1. Is backboard.io free/affordable for a hobby project?
2. How hard is the API integration (litellm compatible? or custom SDK?)
3. Does persistent memory actually work across experiments in practice?
4. What's the privacy model — does backboard store conversation content?
5. Is there a self-hosted option?

## Spike Acceptance Criteria

- [ ] Spike doc written: `tasks/004-backboard-memory-spike-results.md` with answers to all 5 questions
- [ ] Recommendation: integrate / defer / avoid — with reasoning
- [ ] If "integrate": rough implementation plan appended (files to change, estimated effort)

---

## Spike Approach

### Step 1 — Read the docs (30 min)
- https://docs.backboard.io — architecture, pricing, privacy policy
- Look for: Python SDK, REST API, litellm plugin, self-hosted option

### Step 2 — Sign up + smoke test (60 min)
- Create account, get API key
- Try the simplest possible integration: run two litellm calls with shared memory context
- Specifically test: does model B "remember" what model A said in experiment 1 when they meet in experiment 2?

### Step 3 — Evaluate fit (30 min)
Score each criterion 1–5:

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cost | | Free tier? $/month at hobby scale |
| Ease of integration | | Hours to wire up? |
| Memory quality | | Does it actually work? Hallucinate memories? |
| Privacy | | Who stores what? GDPR? |
| Reliability | | Latency added? Uptime SLA? |

### Step 4 — Write results doc + recommendation

---

## Context: Why Persistent Memory Matters for Babel

Current Babel flow:
1. User configures experiment (models + preset)
2. Relay loop runs N rounds
3. Experiment stored in SQLite (content + vocab)
4. Next experiment starts completely fresh

With persistent memory:
1. Models accumulate "history" across experiments
2. "Returning to a debate from last week" — model B picks up where it left off
3. Emerging personalities — Claude-in-Babel develops a consistent rhetorical style over dozens of debates
4. Memory-augmented presets — "debate.yaml: continue from previous session"

This is the same pattern as backboard.io's claim: persistent identity across LLM sessions.

---

## Alternative: DIY Memory

If backboard.io is too costly or complex, consider a Babel-native approach:
- Store a `model_memory` table: `(model_name, experiment_id, memory_text, created_at)`
- At experiment start, fetch last N memory entries for each model
- Prepend as system prompt addition: "In previous conversations, you established: ..."
- Simple, no third-party, privacy-preserving

If backboard.io is not worth it, implement this DIY version instead (upgrade this task).

---

## Files That Would Change (if integrating)

| File | Change |
|------|--------|
| `server/relay_engine.py` | Inject memory context before each model call |
| `server/config.py` | Add `BACKBOARD_API_KEY` (or use env var) |
| `server/db.py` | Possibly add `model_memory` table for DIY approach |
| `ui/src/pages/Configure.tsx` | "Enable memory" toggle |
| `ui/src/pages/Theater.tsx` | Show memory context indicator per model |

---

## Risks

- **Vendor lock-in:** If backboard.io goes down or raises prices, memory layer breaks. DIY SQLite approach is safer for a hobby project.
- **Privacy:** Full conversation content sent to third-party. May not be acceptable depending on what Jordan discusses in Babel.
- **Complexity vs. value:** Is persistent memory actually fun? Or just technically interesting? Validate the user experience before committing.
