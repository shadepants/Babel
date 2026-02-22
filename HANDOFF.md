# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Phase 2 complete + hardened via Gemini review — ready for live testing

## Changes This Session
- [x] Scaffolded React frontend: Vite 7 + React 19 + TypeScript + Tailwind 3.4 + Shadcn/UI v4
- [x] Configured Vite proxy to backend, `@/` path alias, dark arena theme
- [x] Created `run_npm.cmd` wrapper (node not on system PATH — needs wrapper for npm commands)
- [x] Built API layer: types.ts (discriminated union for 5 SSE events), client.ts (fetchJson pattern from Factory), sse.ts (useSSE hook), hooks.ts (useExperimentState event sourcing)
- [x] Built theater components: TurnBubble, ThinkingIndicator, RoundDivider, ConversationColumn (auto-scroll), ExperimentHeader
- [x] Built Theater page: start form (model selects, seed textarea, round slider) → live split-column view with SSE streaming
- [x] Added Layout shell, ErrorBoundary, router with extensible route structure
- [x] Shadcn UI components manually installed (8 components: card, badge, button, separator, scroll-area, select, slider, textarea)
- [x] Reviewed Gemini proposals (Pixel Sprites + Virtual Tabletop) — added to CONTEXT.md roadmap as Future Expansions
- [x] Created GitHub repo: https://github.com/shadepants/Babel
- [x] Gemini Checkpoint 2 — audited + applied 5 fixes:
  - Backend: Queue-based SSE keepalive (prevents async generator corruption)
  - Frontend: React 19 Strict Mode double-mount guard + reconnect event clearing
  - Hooks: O(n²) array spread → `.push()` in useMemo
  - ConversationColumn: Smart auto-scroll via Radix Viewport scroll listener (Gemini's original `onScrollCapture` approach was a no-op — caught during audit)
  - Accessibility: `aria-live="polite"` on ScrollArea + ThinkingIndicator
- [x] Production build passes: 1875 modules, zero errors

## Files Created/Modified
| File | Purpose |
|------|---------|
| `ui/vite.config.ts` | Vite config with `@/` alias + API proxy |
| `ui/tailwind.config.js` | Dark arena theme + model-a/model-b colors |
| `ui/tsconfig.app.json` | Added `baseUrl` + `paths` for `@/` imports |
| `ui/components.json` | Shadcn/UI config |
| `ui/index.html` | Dark class on html, Babel title |
| `ui/postcss.config.js` | PostCSS + Tailwind + Autoprefixer |
| `ui/run_npm.cmd` | npm wrapper with node on PATH |
| `ui/src/index.css` | Tailwind directives + CSS variables + dark scrollbar |
| `ui/src/main.tsx` | React root |
| `ui/src/App.tsx` | Router + ErrorBoundary + Layout |
| `ui/src/lib/utils.ts` | Shadcn `cn()` utility |
| `ui/src/api/types.ts` | All TS interfaces matching backend contract |
| `ui/src/api/client.ts` | fetchJson + api object (3 endpoints) |
| `ui/src/api/sse.ts` | useSSE hook (EventSource, typed events) |
| `ui/src/api/hooks.ts` | useExperimentState (event sourcing) |
| `ui/src/pages/Theater.tsx` | Main page: form → live theater |
| `ui/src/components/theater/TurnBubble.tsx` | Color-coded turn card |
| `ui/src/components/theater/ThinkingIndicator.tsx` | Pulsing dots animation |
| `ui/src/components/theater/RoundDivider.tsx` | Round separator |
| `ui/src/components/theater/ConversationColumn.tsx` | Filtered ScrollArea + auto-scroll |
| `ui/src/components/theater/ExperimentHeader.tsx` | Models, status, progress |
| `ui/src/components/common/Layout.tsx` | App shell with Outlet |
| `ui/src/components/common/ErrorBoundary.tsx` | React error boundary |
| `ui/src/components/ui/*.tsx` | 8 Shadcn UI primitives |
| `CONTEXT.md` | Added Future Expansions section |

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| `vite build` | PASSED | 1875 modules, 0 errors |
| File structure | CORRECT | Matches CONTEXT.md architecture |
| TS types match backend | VERIFIED | Checked against relay_engine.py + relay.py |
| Gemini review audited | YES | 5/5 findings valid, 1 fix corrected (auto-scroll) |
| Live end-to-end test | NOT YET | Needs backend running + browser test |

## Known Issues
- **Node not on system PATH**: All npm/node commands must use full paths or `run_npm.cmd`. The `ProcessStartInfo` pattern works for `node.exe` directly.
- **npm audit**: 10 high severity vulns in Vite dev deps (not production-affecting)
- **Old `@radix-ui/*` packages**: Still in node_modules from initial install. Can be removed — `radix-ui` unified package is used.

## Next Steps
1. **Live test** — Start backend + frontend, run a real experiment in the browser
2. **Phase 3** — Vocabulary Extractor + Dictionary

## Key References
- **Phase 2 plan:** `~/.claude/plans/noble-brewing-fairy.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
- **Gemini proposals:** `GEMINI_Feature_Specification_PIXEL.md`, `GEM_The_Virtual_Tabletop_expansion.md`
