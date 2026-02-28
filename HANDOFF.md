# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-28
**Active Agent:** Claude Code (session 30)
**Current Goal:** Gallery CHM chip, full automated test pass, insights synthesis

## Changes This Session

### Gallery CHM Chip (feat)
- [x] `server/db.py` &mdash; `list_experiments` LEFT JOIN `collaboration_metrics`; computes `chm_score = ROUND((1 - ABS(init_a - init_b) + surprise) / 2, 4)`
- [x] `ui/src/api/types.ts` &mdash; added `chm_score?: number | null` to `ExperimentRecord`
- [x] `ui/src/pages/Gallery.tsx` &mdash; teal `CHM 0.72` chip on completed rows with chemistry data

### Critical Bug Fix: Theater Showing 0 Turns (fix)
- [x] `server/routers/relay.py` &mdash; `agents_dicts` was `None` for standard 2-agent experiments
  - Root cause: `agents_config_json` stored NULL in DB; `parseAgents()` fell back to `model.split('/').pop()` (e.g. `"claude-haiku-4-5-20251001"`) which never matched `get_display_name()` strings (e.g. `"Claude Haiku 4.5"`)
  - Symptom: Theater showed 0 turns for any completed experiment navigated by URL directly
  - Fix: populate `agents_dicts` with `get_display_name()` for all experiment types

### E2E Test Fixes (fix)
- [x] `ui/e2e/smoke-live.spec.ts` &mdash; 3 fixes:
  - `'networkidle'` &rarr; `'load'` (SSE keeps network open forever)
  - `max_tokens: 60` &rarr; `100` (server minimum is `ge=100`)
  - Selector: `[aria-live] .animate-fade-in` &rarr; `[data-testid="turn-bubble"]`
- [x] `ui/src/components/theater/TurnBubble.tsx` &mdash; added `data-testid="turn-bubble"` to root div

### Insights Synthesis (session 30)
- [x] Global `~/.claude/CLAUDE.md` &mdash; Rule 3 strengthened (Task subagents lose ALL win_* tools), Rule 10 duplicate removed
- [x] `CLAUDE.md` &mdash; Playwright+SSE pitfall, `agents_config_json` pitfall, Uvicorn hot-reload caveat, Tests line fixed

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED (session 29) | 0 type errors |
| `smoke.spec.ts` (6 tests) | 4 PASSED, 2 SKIPPED | Static; 2 replaced by smoke-live |
| `features-1-6.spec.ts` (12 tests) | 12 PASSED | All green |
| `smoke-live.spec.ts` (2 tests) | 2 PASSED | Verdict panel + SSE reconnect with live LLMs |
| `rpg-campaign.spec.ts` | NOT RUN | Requires live LLM; run manually |
| Commits | ALL COMMITTED | `3c019ec`, `3bb171c`, `cf74388` |

## Next Steps
1. [ ] A2: Visual RPG test &mdash; run pure-AI RPG session; verify companion colors, DM prose, companion cards
2. [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard
3. [ ] Entity snapshot quality check &mdash; verify `entity_snapshots` table populated after RPG session ends
4. [ ] Live E2E of Features 1-6 &mdash; start both servers, run with `enable_audit=True`, `enable_echo_detector=True`, verify SSE events fire

## Key Patterns Learned This Session

### Playwright + SSE
`page.waitForLoadState('networkidle')` never resolves on Theater pages &mdash; SSE keeps connection open.
Use `'load'` instead. This is now documented in `CLAUDE.md` Critical Pitfalls.

### agents_config_json
Must be populated for ALL relay paths, not just N-way experiments.
```python
# relay.py -- always provide agents_dicts
agents_dicts = (
    [{"model": ac.model, "temperature": ac.temperature, "name": ac.name} for ac in resolved_agents]
    if resolved_agents else
    [{"model": body.model_a, "temperature": body.temperature_a, "name": get_display_name(body.model_a)},
     {"model": body.model_b, "temperature": body.temperature_b, "name": get_display_name(body.model_b)}]
)
```

## Key Files Modified
- `server/db.py` &mdash; `list_experiments` LEFT JOIN chemistry
- `server/routers/relay.py` &mdash; `agents_dicts` populated for all paths
- `ui/src/api/types.ts` &mdash; `chm_score` field
- `ui/src/pages/Gallery.tsx` &mdash; CHM chip
- `ui/src/components/theater/TurnBubble.tsx` &mdash; `data-testid`
- `ui/e2e/smoke-live.spec.ts` &mdash; 3 E2E fixes
