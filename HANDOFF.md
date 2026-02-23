# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Phase 9 complete — neural UI living background enhancements

## What's Done (Cumulative)
- **Phases 1–6:** Full backend + frontend — relay engine, Theater, Dictionary, Gallery, Analytics, Arena, Tournament, Settings
- **Phase 7:** Sci-fi observatory design system — Orbitron/Inter/JetBrains Mono fonts, StarField (tsParticles), Theater reactive canvas, SeedLab stagger animations
- **Phase 8:** Full neural design system — NoiseOverlay, HudBrackets, BABEL shimmer, neural CSS classes, emoji → geometric symbols across all pages, neural terminal panels
- **Phase 9:** Living neural network — StarField rewritten to pure canvas (depth layers, mouse parallax, cascade pulses, route-aware tint), ScrambleText, AnimatePresence page transitions, BABEL glitch, synaptic bloom, activity trails, gamma burst events
- **Encoding fix:** Rewrote all 5 pages via win_write to fix PowerShell UTF-8 double-encoding artifacts

## Changes This Session
- [x] ScrambleText duration bumped 1800ms → 2000ms (~10% slower per user request)
- [x] Configure.tsx — full rewrite fixing SYMBOL_MAP, geometric symbols (`font-mono`), HTML entities for all non-ASCII
- [x] Settings.tsx — rewrite fixing garbled `←` and `—` chars
- [x] Arena.tsx, Gallery.tsx, SeedLab.tsx — rewritten (encoding fix, carried over from previous context)
- [x] StarField: synaptic bloom (#3) — screen-blend halo on pulse arrival, accumulates, decays ~5.5s
- [x] StarField: activity trails (#5) — edges record heat=1.0 while pulse in transit, decay ~1.4s, glow thicker+brighter
- [x] StarField: gamma burst events (#7) — 12-node synchronized fire every 15–40s with expanding ring visual

## Brainstorm Backlog (remaining ideas, not yet implemented)
These were discussed but not built this session — good candidates for future polish:
1. **Resting potential / threshold firing** — nodes accumulate charge, auto-fire when threshold crossed
2. **Directed axon bundles** — grouped parallel edges travelling same direction
3. **Inhibitory nodes** — ~8% of nodes suppress neighbors on pulse receipt (red-violet tint)
4. **Breathing mesh** — slow sine-wave pressure ripple through node field every ~8s
5. **Depth-aware glow halos** — far-layer nodes get softer/larger persistent draw
6. **Node specialization** — sensory/motor/interneuron color types, mixed-color pulse transmission
7. **Entropy/noise drift** — node positions drift on Perlin-style noise field over time

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| ScrambleText duration | DONE | 2000ms default confirmed in source |
| Configure encoding | DONE | Rewritten with win_write + HTML entities |
| Settings encoding | DONE | Rewritten with win_write + HTML entities |
| Bloom / trails / burst | COMMITTED | Not live-tested — requires browser session |
| Vite prod build | NOT RUN | Run `node .\node_modules\vite\bin\vite.js build` to verify |

## Next Steps (Priority Order)
1. [ ] **Settings page polish** — in-app API key configuration (read/write `.env` or env vars), model latency/cost info display, maybe a "test connection" button per provider
2. [ ] **Configure page polish** — add `turn_delay_seconds` slider (currently hardcoded default), preset tag filtering on SeedLab, show estimated cost/time before launching an experiment
3. [ ] **Experiment settings** — per-experiment system prompt preview, save/load custom preset configurations, possibly export a preset to YAML
4. [ ] **Neural background backlog** — pick from brainstorm list above (breathing mesh + depth halos are lowest effort / highest visual impact)
5. [ ] **Side-by-side comparison view** — compare two past experiments head-to-head (long-deferred Phase 6b)

## Git State
- **Branch:** master
- **Latest commits:**
  - `ebcefdd` — `feat(ui): synaptic bloom + edge trails + gamma burst events`
  - `37eeb58` — `fix(ui): restore encoding + slow scramble to 2000ms`
  - `3c010b3` — `fix(ui): symbol rendering artifacts + slow down scramble text`
  - `e059982` — `feat(ui): Phase 9 — living neural network + text scramble + page transitions`
  - `2ac8ec3` — `feat(ui): Phase 8 — full neural design system across all pages`

## Key Files (Phase 8–9)
| File | What it does |
|------|-------------|
| `ui/src/components/common/StarField.tsx` | Pure canvas neural net — depth layers, parallax, cascade pulses, bloom, trails, burst |
| `ui/src/components/common/ScrambleText.tsx` | ASCII scramble → reveal L→R on mount, 2000ms |
| `ui/src/components/common/NoiseOverlay.tsx` | CSS grain texture overlay |
| `ui/src/components/common/HudBrackets.tsx` | Corner bracket decoration for cards |
| `ui/src/components/common/Layout.tsx` | AnimatePresence transitions + BABEL glitch every 9–22s |
| `ui/src/App.tsx` | AppInner reads useLocation() → routeTint() → StarField tintColor prop |
| `ui/src/index.css` | neural-card, neural-row, status-dot, neural-btn, neural-provider, neural-section-label |
| `ui/src/pages/SeedLab.tsx` | Geometric symbols, ScrambleText h1, HudBrackets |
| `ui/src/pages/Gallery.tsx` | Terminal log rows with neural-row classes |
| `ui/src/pages/Arena.tsx` | Neural terminal panel, section labels |
| `ui/src/pages/Configure.tsx` | SYMBOL_MAP, geometric symbols (font-mono), section labels |
| `ui/src/pages/Settings.tsx` | Left-stripe neural-provider panels per API provider |

## Key Encoding Rules (CRITICAL — don't repeat the bug)
- **Never** use PowerShell `Get-Content` + `WriteAllText` to patch UTF-8 files — it double-encodes all multi-byte chars
- **Always** use `win_write` MCP tool for full file writes
- **Always** use HTML entities in JSX for non-ASCII: `&larr;` `&mdash;` `&middot;` `&#9671;` `&#10022;` `&#8594;`
- **Always** use `font-mono` (JetBrains Mono) on spans containing Unicode geometric symbols — Orbitron has no coverage for them
