# 009 — Persona Studio

## Problem
Babel has a persona system (persona_ids) but there is no UI to create or edit personas beyond
whatever the backend stores. Users can't design a custom AI personality, test how it interacts
with another, or understand what effect a persona actually has on model behavior versus using
the base model.

## Goal
A visual persona editor where users define a persona's speaking style, values, and constraints.
Then directly compare a base model against a persona-equipped version of the same model to see
what the persona actually changes.

## Proposed Solution

### Persona fields (editor form)
- **Name** (required, 40 chars)
- **Speaking style** — freetext (e.g., "terse, Socratic, never uses filler words")
- **Values** — up to 5 short value statements (e.g., "prioritize precision over warmth")
- **Forbidden topics** — comma-separated list of topics this persona avoids
- **Signature phrase** — optional phrase the persona tends to use
- **Tone** — dropdown: formal / casual / academic / poetic / technical

The editor compiles these into a system prompt prefix that is prepended to the base model's
system prompt when the persona is active.

### Storage
- Personas stored in a new `personas` table (id, name, compiled_prompt, raw_fields_json, created_at).
- CRUD endpoints: `GET /api/personas`, `POST /api/personas`, `PUT /api/personas/:id`,
  `DELETE /api/personas/:id`.
- Existing `persona_ids` field in RelayStartRequest continues to work; personas referenced by ID.

### Persona Studio page (`/personas`)
- Grid of persona cards (name, tone badge, preview of speaking style).
- "Create" button opens the editor modal.
- "Test" button opens a mini Configure panel pre-loaded with this persona on Agent A and the
  same base model (no persona) on Agent B — lets you immediately see the diff.

### Persona diff view
After the test experiment runs: side-by-side transcript with persona turns highlighted,
and a "Persona Effect" score — judge evaluates how distinctly the persona diverged from
the base model's typical behavior.

## Alternatives Considered
- **Import existing persona from a system prompt file**: useful, add as a secondary input mode.
- **Shared persona library**: see spec 007 for the community library pattern — personas could
  be published there too.

## Risks
- Compiled system prompt may conflict with preset system prompts — need clear prepend/append
  ordering and a preview of the final system prompt before launch.
- "Persona effect" scoring is subjective — define rubric carefully or let users rate it manually.
- Forbidden topics enforcement relies on the model following instructions; non-compliant models
  will seem to "break" the persona.

## Files to Modify
- `server/db.py` — `personas` table, CRUD helpers
- `server/routers/personas.py` — CRUD endpoints (create file)
- `server/app.py` — mount `/api/personas` router
- `server/relay_engine.py` — apply persona prompt prefix when persona_id is set
- `ui/src/pages/Personas.tsx` — persona studio page (create)
- `ui/src/components/PersonaEditor.tsx` — editor modal (create)
- `ui/src/App.tsx` — `/personas` route

## Acceptance Criteria
- [ ] User can create a persona with all 6 fields and save it
- [ ] Persona appears in Configure page's agent dropdowns alongside existing personas
- [ ] "Test" button launches a 4-round experiment: persona model vs bare model, same preset
- [ ] Persona effect score is computed by judge and displayed after the test completes
- [ ] Personas survive server restart (persisted in DB)
- [ ] Compiled system prompt preview is shown in the editor before saving
