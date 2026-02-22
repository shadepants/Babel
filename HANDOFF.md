# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-22
**Active Agent:** Claude Code
**Current Goal:** Phase 7 UI/UX redesign — sci-fi observatory aesthetic

## What's Done (Cumulative)
- **Phase 1:** Backend core — FastAPI, relay engine, EventHub SSE, SQLite WAL, config/registry
- **Phase 2:** React UI — Theater page, SSE streaming, Shadcn components
- **Phase 3:** Vocabulary extractor + dictionary — regex extraction, `relay.vocab` SSE events, Dictionary page with WordCard grid + D3 constellation
- **Phase 4:** Seed Lab + Presets — 6 preset YAMLs, SeedLab landing page, Configure page, Theater simplified to pure live-view, nav bar
- **Phase 5:** Gallery + Analytics — experiment gallery, per-experiment analytics with D3 charts, JSON/markdown export
- **Gemini Checkpoints 1-4:** 17 total fixes across all phases
- **Phase 6:** Arena + Tournament mode, RadarChart, Settings page, "The Original" preset, README, audit hardening, two UI bug fixes
- **Phase 7:** Sci-fi observatory design system + reactive Theater canvas + SeedLab stagger animations

## Session Summary (Phase 7 — UI/UX Overhaul)

### Design System (Section 1)
- **Typography** — Orbitron (display/wordmark), Inter (UI chrome), JetBrains Mono (conversation bubbles) loaded via Google Fonts in `ui/index.html`
- **Color model** — Model A = amber `#F59E0B`, Model B = cyan `#06B6D4`; CSS vars `--glow-a/b`, `--color-active` drive reactive state
- **Tailwind** — `font-display/ui/mono` families, `model-a/b` colors, `glow-a/b/accent` box-shadow tokens
- **StarField** (`ui/src/components/common/StarField.tsx`) — tsParticles, 160 particles, 4 colors (white/lavender/cyan/amber), opacity 0.05–0.9, slow drift; mounted in `App.tsx` as fixed `-z-10` layer; Layout `bg-bg-deep` removed so stars show through
- **BABEL wordmark** — Orbitron font-black, tracking-widest, accent glow via `textShadow`

### Theater Reactive Effects (Section 2)
- **TheaterCanvas** (`ui/src/components/theater/TheaterCanvas.tsx`) — canvas-based pulse rings (50→320px, fading) + 12-dot vocab bursts; Model A origin at 25% width, Model B at 75%
- **Color bleed** — `Theater.tsx` sets `data-active-model` on `document.documentElement` + `--color-active` CSS var when speaker changes; CSS transitions nav border color in 0.8s
- **Thinking glow** — `ConversationColumn.tsx` applies amber/cyan `box-shadow` to column border when `isThinking`; glassmorphism `bg-bg-card/40 backdrop-blur-sm`
- **`turn_delay_seconds`** — new field in `RelayStartRequest` (default 2.0s, max 10s); passed through relay router to `run_relay()`; `asyncio.sleep()` between turns so animations breathe

### SeedLab Animations (Section 3)
- **Framer Motion stagger** — heading fades up (500ms easeOut), then cards stagger in at 100ms intervals with `y: 22 → 0, opacity: 0 → 1`, cubic-bezier easing
- **Hover** — `scale: 1.025` + accent purple glow `rgba(139, 92, 246, 0.30)`, 200ms; tap `scale: 0.98`
- **Custom card** — last in stagger sequence, slightly dimmer hover glow

## Verification Status
| Check | Status | Notes |
|-------|--------|-------|
| Dev server loads | PASSED | No console errors on `localhost:5173` |
| StarField visible | PASSED | Stars drift behind all pages |
| Orbitron wordmark | PASSED | BABEL in Orbitron with purple glow |
| JetBrains Mono turns | PASSED | Conversation text in mono font |
| SeedLab stagger | PASSED | Cards cascade in at 100ms intervals |
| Theater canvas | NOT LIVE TESTED | Requires running experiment to see pulse rings |
| Vite prod build | NOT RUN | Run `node .\node_modules\vite\bin\vite.js build` to verify |
| Commits pushed | PASSED | `4ea4109` on master |

## Known Issues / Next Steps
- **Theater pulse rings** — not verified with a live experiment yet; canvas mounts correctly but animation only triggers on real SSE turn events
- **Section 4 (future)** — per-page polish pass: Gallery, Analytics, Arena, Tournament, Dictionary pages not yet touched by UI/UX work
- **Side-by-side comparison view** — long-term deferred (Phase 6b idea)
- **pytest not in venv** — `pip install pytest` needed before running backend tests
- **Pre-existing TS type warnings** — `turn_id` string/number mismatch in `sse.ts`, unused `modelB` in `WordCard.tsx` — don't block build

## Git State
- **Branch:** master
- **Latest commits:**
  - `4ea4109` — `feat(ui): sci-fi observatory design system + Theater/SeedLab animations`
  - `80313a0` — `docs: update CONTEXT.md and HANDOFF.md for Phase 6 completion`
  - `a81f777` — `fix: LatencyChart CSS selector crash + copy markdown clipboard fallback`

## Key Files Changed This Session
| File | What changed |
|------|-------------|
| `ui/index.html` | Google Fonts (Orbitron, Inter, JetBrains Mono) |
| `ui/src/index.css` | CSS vars, model colors, glow tokens, nav border transition |
| `ui/tailwind.config.js` | Font families, amber/cyan colors, glow shadows |
| `ui/src/App.tsx` | Mounts `<StarField />` |
| `ui/src/components/common/StarField.tsx` | NEW — tsParticles star field |
| `ui/src/components/common/Layout.tsx` | Orbitron wordmark, transparent bg, backdrop-blur nav |
| `ui/src/components/theater/TheaterCanvas.tsx` | NEW — canvas pulse rings + vocab bursts |
| `ui/src/components/theater/ConversationColumn.tsx` | Thinking glow, glassmorphism |
| `ui/src/components/theater/TurnBubble.tsx` | JetBrains Mono, model-color glow |
| `ui/src/pages/Theater.tsx` | Mounts canvas, sets data-active-model, color bleed |
| `ui/src/pages/SeedLab.tsx` | Framer Motion stagger animations |
| `server/relay_engine.py` | `turn_delay_seconds` param |
| `server/routers/relay.py` | `turn_delay_seconds` field + pass-through |

## Key References
- **Phase 7 plan:** `~/.claude/plans/swift-discovering-beaver.md`
- **Master plan:** `~/.claude/plans/partitioned-coalescing-barto.md`
