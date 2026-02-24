# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23
**Active Agent:** Claude Code
**Current Goal:** Phase 11 complete &mdash; all 7 quick-win features shipped

## Commits Pushed This Session
- *(commit pending &mdash; see below)*

## What Was Done

### Phase 11: Quick Wins &amp; Polish (ALL DONE)

**Backend (server/)**
- `server/db.py` &mdash; `label TEXT` idempotent migration + `set_label()` method
- `server/routers/experiments.py` &mdash; `PATCH /{id}/label` endpoint with Pydantic `_LabelBody`

**API layer (ui/src/api/)**
- `types.ts` &mdash; `label?: string | null` added to `ExperimentRecord`
- `client.ts` &mdash; `setExperimentLabel(experimentId, label)` method

**Frontend features**
- `Theater.tsx` &mdash; tab title live state (`&bull; R.N | Babel` / `&check; Done | Babel`); `effectiveVocab` SSE+DB fallback pattern; passes vocab+experimentId to ConversationColumns
- `ConversationColumn.tsx` &mdash; `vocab?` and `experimentId?` props forwarded to TurnBubble
- `TurnBubble.tsx` &mdash; hover timestamps (latency badge &rarr; wall-clock on hover); `linkifyVocab()` wraps coined words in `&lt;Link&gt;` to dictionary anchors; skips on `isLatest` turn
- `Configure.tsx` &mdash; `&#8646; swap` button (swaps model A&harr;B + temperatures); `useSearchParams` reads `?remix=<id>` and pre-fills models/temps/seed from that experiment
- `Analytics.tsx` &mdash; inline nickname editor (`// add nickname...` &rarr; input &rarr; Enter/save/cancel); Remix button in quick links
- `Gallery.tsx` &mdash; label display in metadata row; Remix button navigates to `/configure/:preset?remix=<id>`
- `Dictionary.tsx` &mdash; `id="word-{slug}"` anchors on each WordCard for deep linking

**Also from prior session (Playwright smoke tests)**
- `ui/playwright.config.ts` + `ui/e2e/` &mdash; 4 of 6 smoke tests automated (tests 5+6 skipped: require live data)
- `ui/package.json` / `ui/package-lock.json` &mdash; `@playwright/test` devDependency added

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript `tsc --noEmit` | PASSED | Confirmed 0 errors (session 5) |
| Phase 11 code review | VISUAL PASS | All 14 file edits applied cleanly via diff |
| Playwright tests 1-4 | READY | Config/e2e files in place; run `npm run test:e2e` when servers up |
| Playwright tests 5-6 | SKIPPED | Require completed experiment with verdict in DB |
| SSE reconnect / Last-Event-ID | SKIPPED | Manual: disable network mid-run, re-enable, verify replay |
| Live experiment smoke test | SKIPPED | Run experiment to verify sprites, glitch, timestamps |

## New Patterns Introduced (Phase 11)

- **`effectiveVocab`** &mdash; same SSE-first/DB-fallback pattern as `effectiveTurns`/`effectiveScores`/`effectiveVerdict`. Theater fetches `api.getVocabulary()` for completed experiments and maps VocabWord &rarr; VocabEvent shape.
- **Experiment label/nickname** &mdash; `label TEXT` column nullable. `PATCH /api/experiments/{id}/label` with `{"label": "string | null"}`. Gallery + Analytics display/edit it.
- **Remix flow** &mdash; `?remix=<id>` query param on Configure page. `useSearchParams()` reads it; `api.getExperiment(remixId)` fetches source; overrides modelA/B/temps/seed. Gallery + Analytics both have Remix buttons.
- **Dictionary deep links** &mdash; `id="word-{slug}"` on WordCard wrappers. Slug: `word.toLowerCase().replace(/\s+/g, '-')`. TurnBubble links: `/dictionary/${experimentId}#word-${slug}`.
- **linkifyVocab** &mdash; sorts vocab by word length desc (longest first wins overlap), escapes regex chars via function `(m) =&gt; '\\' + m` (NOT `'\\$&amp;'` &mdash; mcp__filesystem__edit_file `$&amp;` replacement bug). Skips on `isLatest` turn (TypewriterText still animating).

## Next Steps

1. [ ] **Run `npm run test:e2e`** against live servers to confirm smoke tests 1-4 pass
2. [ ] **Phase 12** (2-3 days): `/watch/:id` spectator mode, Share button, highlight reel, speed control mid-run
3. [ ] **Phase 13b** (3-4 days): Virtual Tabletop RPG mode &mdash; full spec in `~/.claude/plans/wise-sleeping-key.md`
4. [ ] **SSE reconnect test** &mdash; manual: disable network mid-experiment, verify Last-Event-ID replay on reconnect

## Key Patterns (carry forward)

- **SSE-first / DB-fallback**: `effectiveX = sse.x ?? dbX` &mdash; turns, scores, verdict, **vocab** (new in Phase 11)
- **Decoupled event bus**: `window.dispatchEvent(new CustomEvent('babel-glitch'))`
- **Shared color util**: `ui/src/lib/presetColors.ts`
- **Idempotent migrations**: catch-except on `ALTER TABLE ... ADD COLUMN` in db.py
- **win_write + HTML entities**: avoid raw Unicode in JSX/TS to prevent encoding mismatch
- **mcp__filesystem__edit_file danger**: `$&amp;` / `$'` / `$\`` in newText cause duplication via JS replace(). Use function-based regex escapers; use win_write for full rewrites.
