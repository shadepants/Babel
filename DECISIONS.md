# Architecture Decisions — Babel

<!-- Feeds: ~/.claude/homunculus/decisions-aggregator.py -->
<!-- Format: ID | Category | Date | Decision | Rationale -->
<!-- Categories: platform_wrong | hallucination | scope_creep | architecture | tooling | deprecated | security -->

| ID | Category | Date | Decision | Rationale |
|----|----------|------|----------|-----------|
| BAB-001 | architecture | 2026-02-01 | FastAPI + React over Django/Next.js | Lightweight; async-first; React gives full control over UI |
| BAB-002 | tooling | 2026-02-05 | LiteLLM for multi-provider | Single interface to OpenAI/Anthropic/Gemini; easy model switching |
| BAB-003 | architecture | 2026-02-10 | Relay engine as standalone module | Decouples provider logic from API routes; enables independent testing |
| BAB-004 | deprecated | 2026-02-12 | Rejected: LangChain abstractions | Over-engineered for Babel's use case; hides too much |
| BAB-005 | scope_creep | 2026-02-20 | Deferred: real-time streaming UI | Phase 2; current MVP uses polling |
