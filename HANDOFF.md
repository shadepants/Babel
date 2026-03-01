# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-03-01
**Active Agent:** Claude Code (session 32)
**Current Goal:** Bug fixes -- entity snapshot, security vulnerability, F6 agendas 404

## Changes This Session
- [x] **Entity snapshot fix** (`server/summarizer_engine.py`) -- `max_tokens=800` silently truncated JSON output; `json.loads` raised `JSONDecodeError` caught by bare `except Exception` -- always returned None, no snapshot ever saved. Fixed: `800 -> 2000` + `finish_reason='length'` warning. Diagnosed via `_diag_snapshot.py` (temp, deleted).
- [x] **Dependabot CVE-2026-27606** (`ui/package-lock.json`) -- rollup 4.58.0 -> 4.59.0 (arbitrary file write via path traversal, high severity). Also fixed minimatch ReDoS via `npm audit fix`. 0 vulnerabilities remaining. GitHub re-scans asynchronously -- may still show open alert briefly.
- [x] **F6 `/agendas` 404 fix** (`server/db.py`, `server/routers/relay.py`) -- `hidden_goals` passed to relay but never written to DB. `db.create_experiment()` had no `hidden_goals_json` param; INSERT excluded it. Fixed: added param + serialization + INSERT column; relay.py now passes `body.hidden_goals`. `live-features.spec.ts` F6 test tightened to `expect(200)` -- passes in 11.8s.

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| Entity snapshot diagnostic | PASSED | `generate_entity_snapshot` returns 5-key dict for session `c9a7b17a4d99` |
| `npm audit` | PASSED | 0 vulnerabilities after rollup + minimatch fixes |
| F6 live Playwright test | PASSED | 11.8s, `/agendas` returns 200 with 2 hidden goals |
| Backend import check | PASSED | `server.db` + `server.routers.relay` import cleanly after db.py changes |
| tsc --noEmit | NOT RUN | No frontend changes this session |

## Commits This Session
```
b75c0b9  fix(summarizer): increase entity snapshot max_tokens 800->2000
e962eee  fix(deps): update rollup 4.58->4.59, fix minimatch ReDoS (CVE-2026-27606)
ec01dd6  fix(F6): persist hidden_goals_json to DB on experiment creation
8bdbc41  test(F6): tighten /agendas assertion to expect(200) after fix
```

## Next Steps
1. [ ] Confirm Dependabot alert auto-closes (GitHub re-scans after push; check `github.com/shadepants/Babel/security`)
2. [ ] Stress test entity snapshots -- run a fresh RPG session end-to-end and verify `entity_snapshots` table gets populated
3. [ ] Consider: run full live-features.spec.ts suite (all 4 tests) to re-confirm nothing regressed after server restart + fixes
4. [ ] No other known blockers -- all session 31 "Next" items resolved

## Key Technical Notes
- **Entity snapshot root cause:** `gemini/gemini-2.5-flash` + `response_format=json_object` works fine; issue was purely token budget. The structured chronicle (5 categories + full arrays) requires >800 tokens.
- **F6 agendas:** The `hidden_goals_json` column existed in the schema (`db.py:346`) but was never written. The GET endpoint read from it but always found NULL. Fix is additive (no migration needed -- column already existed with NULL default).
- **`_verify_imports.py`** left in repo root (untracked) -- safe to delete.
