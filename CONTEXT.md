# Babel &mdash; AI-to-AI Conversation Arena

**Last Updated:** 2026-02-25 (session 17 complete &mdash; Phase 17 SHIPPED, technical debt remediated)

## 1. Goal
A standalone shareable web app where AI models talk to each other in real-time &mdash; co-inventing languages, debating ideas, writing stories, and evolving shared intelligence. Watch it happen live in the browser.

## 2. Tech Stack
- **Language:** Python 3.13 (backend), TypeScript 5.7 (frontend)
- **Backend:** FastAPI (port 8000)
- **LLM Routing:** litellm (9+ providers)
- **Real-time:** Server-Sent Events (SSE) with persistence via `system_events`
- **Frontend:** React 19 + Vite 7 + Tailwind 3.4
- **Database:** SQLite (WAL mode) with async background writer queue
- **Testing:** Playwright E2E (rpg-campaign.spec.ts)

## 3. Current State: Phase 17+ (Stable Research Facility)

### Phase 17 - Context & Resiliency (SHIPPED)
- [x] **Layered Context Core** &mdash; Frozen (Bible), Cold (Summaries), Hot (Sliding Window)
- [x] **Asymmetric Fog of War** &mdash; `visibility_json` column + agent-specific prompt filtering
- [x] **Persistent SSE Buffer** &mdash; history survives server restarts via DB serialization
- [x] **RPG Session Recovery** &mdash; campaigns resume from last speaker state via `rpg_state`
- [x] **Background DB Writer** &mdash; removed global write-lock bottleneck via `asyncio.Queue`

### Advanced Mechanics (SHIPPED)
- [x] **Visual Choice Architecture** &mdash; DM output `[CHECK: ...]` tags trigger 3D Dice animations
- [x] **Zero-Sum Pressure Valve** &mdash; Judge model monitors for cooperative drift (P12) and injects stress
- [x] **Strict Vocab Extraction** &mdash; regex filtering improved to reduce noise in non-conlang modes

### Operational & Security (SHIPPED)
- [x] **Dynamic SHARE_PASSWORD** &mdash; secure 12-char key generated if .env is missing
- [x] **Script Portability** &mdash; all .ps1 scripts use $PSScriptRoot; absolute paths removed
- [x] **SVG ID Collision Guard** &mdash; SpriteAvatar uses `useId()` for DOM safety
- [x] **Optimized share.ps1** &mdash; hash-based lazy pip install + Localtunnel verification

## 4. Architecture (v17.0)
```
Babel/
  server/
    summarizer_engine.py       Phase 17: Condenses history and extracts entities (Frozen/Cold)
    relay_engine.py            Updated with layered prompt construction + asymmetric filters
    rpg_engine.py              Updated with state serialization and pressure valve checks
    db.py                      Refactored with non-blocking worker queue
    event_hub.py               Updated with serialize/hydrate for persistence
  ui/src/
    components/theater/
      EndSessionModal.tsx      Interactive summary and exit modal
      DiceOverlay.tsx          3D CSS/Framer-motion dice animation
      SpriteAvatar.tsx         Updated with useId() collision guards
  docs/audit_reports/          10+ comprehensive research and audit docs from Session 17
```

## 5. Metadata Registry
- **Backend:** FastAPI (8000), litellm, aiosqlite, SQLite WAL.
- **Frontend:** React 19, Vite, Tailwind, Shadcn UI v4.
- **Primary Font:** Orbitron (Headers), Mono Fallback (.font-symbol).
