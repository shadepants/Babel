# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-27
**Active Agent:** Claude Code (session 29)
**Current Goal:** E2E testing pass for sessions 27-28 features; all previously-skipped tests now automatable

## Changes This Session

### Bug Fix
- [x] `ui/src/pages/Analytics.tsx:74` &mdash; added `radarRes.models &&` null guard before `.length` access
  - Root cause: `/api/experiments/{id}/radar` returns `{"models": null}` for RPG multi-participant experiments
  - Symptom: Analytics page crashed with JS error for any RPG experiment, showing error state instead of stat cards

### New E2E Specs
- [x] `ui/e2e/features-1-6.spec.ts` &mdash; 12 tests covering all 6 session 27-28 features:
  - API contracts: pairing-oracle, evolution-tree, chemistry, audit, agendas (all return expected status codes)
  - Configure UI: echo_detection, adversarial_mode, audit sections; oracle_suggestions button
  - Dictionary: evolution tab renders without crash
  - Analytics: renders without crash when chemistry is null (regression guard)
- [x] `ui/e2e/smoke-live.spec.ts` &mdash; 2 self-provisioning tests (replace previously-skipped ones):
  - **Test 5 (live):** Starts a 1-round experiment with `enable_verdict=true`, polls until completed, navigates to Theater and asserts `.neural-section-label:has-text("final_verdict")` is visible
  - **Test 6 (live):** Starts a 6-round / `turn_delay_seconds: 2` experiment, navigates immediately, aborts SSE stream, restores, asserts replay count &gt;= pre-drop count

### Investigation
- [x] Double `/api/presets` fetch &mdash; React Strict Mode dev-only behavior; not a bug; no action needed

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `tsc --noEmit` | PASSED | 0 type errors |
| `smoke.spec.ts` (6 tests) | 4 PASSED, 2 SKIPPED | Skipped replaced by smoke-live.spec.ts |
| `features-1-6.spec.ts` (12 tests) | 12 PASSED | All green |
| Combined static suite (18 tests) | 16 PASSED, 2 SKIPPED | Clean |
| `smoke-live.spec.ts` (2 tests) | PARSED OK, NOT RUN | Requires live LLM; run with `npm run test:e2e -- smoke-live` |
| `rpg-campaign.spec.ts` | NOT RUN | Requires live LLM; run manually |
| Commit | PENDING | 3 new/modified files not yet committed |

## Uncommitted Files
```
M  ui/src/pages/Analytics.tsx      (null guard bug fix)
?? ui/e2e/features-1-6.spec.ts     (12 Feature 1-6 tests)
?? ui/e2e/smoke-live.spec.ts       (2 self-provisioning tests)
```
To commit: `git add ui/src/pages/Analytics.tsx ui/e2e/features-1-6.spec.ts ui/e2e/smoke-live.spec.ts`

## Next Steps
1. [ ] **Commit session 29** &mdash; `Analytics.tsx` + `features-1-6.spec.ts` + `smoke-live.spec.ts`
2. [ ] **Run smoke-live manually** &mdash; `npm run test:e2e -- smoke-live` to verify verdict + SSE reconnect with real LLMs
3. [ ] **Gallery CHM chip** &mdash; `(initiative_balance + surprise_index) / 2` shown as `CHM 0.72` chip on completed experiment rows (low priority, deferred)
4. [ ] A2: Visual RPG test &mdash; run pure-AI RPG session; verify companion colors, DM prose, companion cards
5. [ ] A3: P11 regression &mdash; Deepseek DM + non-Groq party, verify phantom NPC guard
6. [ ] Entity snapshot quality check &mdash; verify `entity_snapshots` table populated after RPG session

## Playwright Selector Patterns Learned This Session
`text='// foo'` triggers Playwright regex parsing (`//` = delimiters). Two safe alternatives:

```typescript
// 1. CSS :has-text() -- substring match, no regex
page.locator('.neural-section-label:has-text("echo_detection")')

// 2. For content without // prefix
page.locator('text=winner:')   // safe -- no // anywhere
```

## Key Files
- `ui/e2e/smoke-live.spec.ts` &mdash; self-provisioning verdict + SSE reconnect tests
- `ui/e2e/features-1-6.spec.ts` &mdash; static Feature 1-6 API + UI tests
- `ui/src/pages/Analytics.tsx:74` &mdash; null guard fix (`radarRes.models &&`)
