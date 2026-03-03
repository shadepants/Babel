# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-02
**Active Agent:** Claude Code (session 41)
**Current Goal:** Commit backlog + wire relay status + spec 014 shareable URLs

## Changes This Session

### Commits shipped (5 total)
- [x] `feat(spec-017)` `4278a44` &mdash; replication runs backend + frontend (sessions 39-40 backlog)
- [x] `feat(spec-020)` `0d8a504` &mdash; help system: Tooltip component + /help page + nav link
- [x] `perf(ui)` `79cd1d2` &mdash; Vite manualChunks + React.lazy() 17 pages + 5-file TS cleanup
- [x] `fix(spec-017)` `09df6a3` &mdash; `_cleanup_task` done-callback now fires `update_replication_group_status`; group status auto-flips after each experiment completes
- [x] `feat(spec-014)` `28568de` &mdash; `?cfg=<JSON>` shareable config URLs; share button copies URL; form pre-fills all state on mount

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED | Zero errors |
| Backend startup | PASSED | uvicorn reload on relay.py change confirmed |
| Configure page load | PASSED | Screenshot verified, no console errors |
| Share button | PASSED | Clipboard payload confirmed (agents, rounds, seed, toggles) |
| Round-trip pre-fill | PASSED | rounds=8, maxTokens=2000, turnDelay=1.5s, seed, replicationCount=3 all restored |
| Launch button label | PASSED | Shows "LAUNCH 3 REPLICATIONS" when replicationCount=3 |

## Next Priorities (in recommended order)

1. **Spec 005 &mdash; Hypothesis Testing Mode** *(Medium, ~3-4h)*
   - Structured experiment flow: user states a hypothesis, agents debate it, judge evaluates evidence quality
   - Highest research value; unlocks quantitative claims about model behavior
   - Task file: `tasks/005-hypothesis-testing-mode.md`

2. **Spec 006 &mdash; A/B Forking Dashboard** *(Medium, ~2-3h)*
   - Visual branch tree for fork experiments; shows divergence from parent turn
   - Makes the fork feature discoverable and navigable
   - Task file: `tasks/006-ab-forking-dashboard.md`

3. **RelayConfig wiring** *(Refactor, ~1h)*
   - `RelayConfig` dataclass exists in `config.py` but `run_relay()` still takes 20+ individual kwargs
   - 4 call sites need updating: `relay.py` (2x), `rpg_engine.py`, `recover_stale_sessions`
   - Low risk, cleans up the biggest technical debt in the codebase

4. **Set `JUDGE_MODEL` in `.env`** *(Config, 5 min)*
   - Current default burns Gemini Flash quota on every scored experiment
   - Set `JUDGE_MODEL=anthropic/claude-haiku-4-5-20251001` for cost-effective scoring

## Session Log Entry
Session 41: Committed 5 commits covering spec-017 (replication runs), spec-020 (help system), perf optimization (code splitting), spec-017 relay fix (group status auto-update), and spec-014 (shareable config URLs). All verified against live servers. Roadmap now has 5 specs shipped; spec-005 is the highest-value next item.
