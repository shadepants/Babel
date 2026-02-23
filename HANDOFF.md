# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23
**Active Agent:** Claude Code
**Current Goal:** Planning session &mdash; brainstormed and phased upgrade roadmap

## Changes This Session

### No code changes &mdash; planning only
- [x] Reviewed priority list of remaining work (smoke tests + Phase 6b deferred)
- [x] Brainstormed upgrades small&rarr;large across 6 categories
- [x] Created phase plans 11&ndash;16 in `~/.claude/plans/wise-sleeping-key.md`
- [x] Updated `CONTEXT.md` &mdash; added Roadmap section with Phases 11&ndash;16 table

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript `tsc --noEmit` | PASSED | 0 errors (carried from last session) |
| Verdict persistence (manual) | SKIPPED | Requires live experiment with enable_verdict=true |
| DB fallback after restart | SKIPPED | Requires server restart + Theater reload |
| Gallery sprites visible | SKIPPED | Visual smoke test needed |
| Analytics sprites visible | SKIPPED | Visual smoke test needed |
| Configure preset border | SKIPPED | Visual smoke test needed |
| BABEL glitch on turn arrival | SKIPPED | Requires live experiment |
| SSE reconnect / Last-Event-ID | SKIPPED | Manual: disable network mid-run, re-enable, verify replay |

## Phase Roadmap Summary

| Phase | Theme | Effort |
|-------|-------|--------|
| **11** | Quick Wins &amp; Polish | ~1 day |
| **12** | Spectator &amp; Shareability | 2&ndash;3 d |
| **13** | Interactive Experiments | 3&ndash;4 d |
| **14** | Cross-Experiment Intelligence | 4&ndash;5 d |
| **15** | New Conversation Structures | 5&ndash;7 d |
| **16** | Depth &amp; Legacy | 1&ndash;3 wk |

Full specs: `~/.claude/plans/wise-sleeping-key.md`

## Next Steps

1. [ ] **Manual smoke tests** &mdash; run a live experiment; verify Gallery sprites, Analytics sprites, Configure border, verdict persistence, BABEL glitch
2. [ ] **SSE reconnect test** &mdash; disable network mid-experiment, re-enable, confirm only missed turns replay
3. [ ] **Phase 11** &mdash; Quick Wins (~1 day): Remix button, tab title live state, hover timestamps, vocab inline linking, model A&harr;B swap, experiment nickname
4. [ ] **Phase 12** &mdash; Spectator &amp; Shareability: `/watch/:id` route, Share button, highlight reel, speed control

## Key Patterns (carry forward)
- **SSE-first / DB-fallback**: `effectiveX = sse.x ?? dbX` &mdash; turns, scores, verdict all follow this
- **Decoupled event bus**: `window.dispatchEvent(new CustomEvent('babel-glitch'))` &mdash; no prop drilling
- **Shared color util**: `ui/src/lib/presetColors.ts` &mdash; single source of truth for preset glow colors
- **Idempotent migrations**: always use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern in db.py
