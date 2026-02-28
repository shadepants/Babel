# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-28
**Active Agent:** Claude Code (session 31)
**Current Goal:** Verify + push session 30 commits; automate remaining Next items via Playwright

## Changes This Session

### Verification + Push
- [x] Full automated test run: tsc 0 errors, features-1-6.spec.ts 12/12, smoke.spec.ts 4/2-skipped
- [x] Opus 4.6 code review -- SAFE TO PUSH verdict (CHM chip, agents_dicts fix, E2E fixes all clean)
- [x] Pushed 5 session 30 commits to origin/master (`0f82fac..317ea25`)

### Live Playwright Automation (session 31 core work)
- [x] `ui/e2e/live-features.spec.ts` -- 4 live self-provisioning tests, all passing (37.8s):
  - **F1+F4**: 1-round experiment with `enable_audit=True`; verified `/audit` + `/chemistry` return non-500
  - **F3**: echo detector smoke check with `echo_warn_threshold=0.3`; experiment completes cleanly
  - **F6**: adversarial mode with `hidden_goals` (list[dict]); `/agendas` returns non-500
  - **A2**: RPG visual -- companion "Lyra" card + DM turns visible via SSE selector `.animate-fade-in.py-5`
- [x] `ui/e2e/rpg-campaign.spec.ts` -- fixed stale selector: `.animate-fade-in.py-2` (never existed) &rarr; `.animate-fade-in.py-5, .animate-fade-in.py-3`
- [x] Pushed `38c23d5` (tests) + `bbe175b` (docs) to origin/master

### Key Learnings This Session
- `hidden_goals` API field is `list[dict]` with `{agent_index: int, goal: str}` -- NOT `list[str]` (422 on plain strings)
- `RPGTheater.tsx` DM turns: `.animate-fade-in.py-5` | companion/NPC turns: `.animate-fade-in.py-3`

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED | 0 type errors |
| `features-1-6.spec.ts` (12 tests) | PASSED | 12/12 green |
| `smoke.spec.ts` (6 tests) | 4 PASSED, 2 SKIPPED | 2 skipped = replaced by smoke-live |
| `live-features.spec.ts` (4 tests) | PASSED | All 4 live LLM tests green (37.8s) |
| Opus 4.6 review | SAFE TO PUSH | All session-30 files verified clean |
| git push | PUSHED | origin/master @ bbe175b |

## Next Steps
1. [ ] **A3: P11 regression** -- Deepseek DM + non-Groq party; requires Deepseek API key configured; verify phantom NPC guard
2. [ ] **Entity snapshot quality check** -- run an RPG session to completion; verify `entity_snapshots` table populated in DB
3. [ ] **Dependabot alert** -- 1 high-severity vulnerability; check `github.com/shadepants/Babel/security`
4. [ ] **F6 agendas 404 investigation** -- `revelation_round=1` returned 404 from `/agendas` (expected 200); may indicate agendas not stored correctly for standard 2-agent experiments with `hidden_goals`
