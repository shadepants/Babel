# 008 — Live Intervention Console

## Problem
Experiments are currently fire-and-forget. Once running, you can pause/resume and inject a single
human turn, but you cannot: adjust temperature mid-run, swap the observer, inject a "chaos agent"
message from a third model, or target a specific agent for the next turn. The experiment feels
like watching TV rather than directing a show.

## Goal
A collapsible side panel in Theater that gives live control over a running experiment: inject
turns (any speaker), adjust per-agent temperature on the fly, fire one-shot chaos messages from
any model, and queue directives for the next turn.

## Proposed Solution

### Intervention Panel (Theater sidebar, running experiments only)
Tabs:
1. **Inject** — existing human inject, but extended:
   - Speaker name (freetext or pick from agent list)
   - Content textarea
   - "Send now" (immediate) or "Queue for next turn" (injected before next agent's response)
2. **Nudge** — temperature sliders per agent (A, B, observer). Changes take effect on the next
   turn via a backend state update.
3. **Chaos** — "Fire one-shot from model": pick any registered model, type a message, it appears
   as a single interjection turn attributed to that model. Does not persist.
4. **Directive** — "Whisper to agent": send a private system-level nudge to agent A or B only,
   not visible in the main transcript, that influences their next response. Useful for testing
   if agents can be steered without the other noticing.

### Backend changes
- `PATCH /api/relay/{match_id}/temperature` — update per-agent temperature in the running engine's
  config object. The relay engine reads temperature from a mutable dict, not a frozen config.
- `POST /api/relay/{match_id}/chaos` — body: `{model, content}`. Engine inserts a special turn
  with `speaker="chaos"` and `model=<chaos_model>`, fires one LLM call, adds to transcript.
- `POST /api/relay/{match_id}/whisper` — body: `{agent_index, directive}`. Engine prepends
  directive to that agent's next system message (one-time, cleared after use).

### State management
The relay engine currently carries `temperature_a` / `temperature_b` as local variables.
Refactor to a `RunState` dataclass (or dict on `request.app.state`) keyed by match_id, so
in-flight PATCH requests can mutate it between turns.

## Alternatives Considered
- **Full control plane via SSE command channel**: bidirectional SSE is complex; POST endpoints
  are simpler and sufficient.
- **Limit to inject-only**: preserves simplicity but misses the most interesting interventions
  (temperature nudge, whisper).

## Risks
- Temperature PATCH between turns requires the engine to poll state; if it reads once at startup
  this won't work. Must audit relay_engine.py for where temperature is read.
- Chaos model calls add latency and cost mid-experiment without user confirmation — show cost
  estimate in the UI before firing.
- Whisper directive could cause model to break character or reveal the directive. Document as
  expected behavior, not a bug.

## Files to Modify
- `server/relay_engine.py` — refactor temperature to mutable RunState; add whisper support
- `server/routers/relay.py` — `PATCH /temperature`, `POST /chaos`, `POST /whisper` endpoints
- `ui/src/pages/Theater.tsx` — intervention panel (collapsible sidebar)
- `ui/src/components/InterventionPanel.tsx` — new component with 4 tabs

## Acceptance Criteria
- [ ] Inject tab sends a turn and it appears in the live transcript within 2 seconds
- [ ] Nudge tab sliders update per-agent temperature; the change is reflected in the next turn's
      metadata (logged temperature value)
- [ ] Chaos tab fires a one-shot model call; the resulting turn appears with speaker="chaos"
- [ ] Whisper tab sends a private directive; the target agent's next response is visibly
      influenced (manual verification)
- [ ] Intervention panel is hidden when experiment is not running (completed/failed state)
