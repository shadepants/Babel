# Babel Implementation Notes

Detailed implementation notes for subsystems. These are reference material for when you're working in a specific area — not rules to memorize upfront.

## SSE + EventHub
- EventHub assigns monotonic `event_id` in `publish()`. Routers emit `id: N\n` before `data:`. On reconnect, browser sends `Last-Event-ID` header for selective history replay.
- Tournament SSE uses `match_id=tournament_id` — reuses EventHub filter unchanged; individual match events still use their own experiment IDs.
- Theater DB fallback: EventHub history is in-memory; server restart wipes it. Theater.tsx fetches turns + scores + verdict for completed experiments. `effectiveTurns`, `effectiveScores`, `effectiveVerdict` prefer SSE, fall back to DB.

## Scoring + Verdicts
- `judge_model` stored in experiments table (DEFAULT: config.JUDGE_MODEL = gemini-2.5-flash). `enable_scoring` fires `score_turn()` after each turn (fire-and-forget). `enable_verdict` fires `final_verdict()` at end. Both opt-in in Configure. `turn_scores` table. Scoring fails gracefully.
- `winner` + `verdict_reasoning` stored in experiments table. `save_verdict()` called in `final_verdict()` after hub publish. `dbVerdict` state in Theater.tsx reconstructed from `exp.winner` / `exp.verdict_reasoning`.

## Theater Sprites + Animation
- `SpriteAvatar` clipPath IDs: `face-clip-{instanceId}` — pass unique `instanceId` per instance to avoid SVG collision across multiple SVGs on the same page.
- `talkingSpeaker` uses a timeout keyed on `lastTurn.turn_id`. `latestTurnId` is null for completed experiments (typewriter only fires live).
- BABEL glitch event: Theater dispatches `window.dispatchEvent(new CustomEvent('babel-glitch'))` on each live turn arrival. Layout.tsx listens and fires `runGlitch()` immediately. Decoupled CustomEvent pattern.

## Temperature
- `temperature_a` and `temperature_b` in experiments table (DEFAULT 0.7). `RelayStartRequest` requires both. Tournament mode uses single temperature (both agents share same value).

## Preset Colors
- `ui/src/lib/presetColors.ts` is the single source of truth for `PRESET_GLOW` map and `getPresetGlow()`. ArenaStage, Gallery, Configure all import from here. When adding a new preset YAML, add its color here too.

## Memory System
- `model_memory` table keyed on `(model_a, model_b)` canonical sorted pair. `generate_memory_summary()` is deterministic (vocab-based, no LLM call). `enable_memory` toggle in Configure. Memory injected at experiment start; saved as background task after verdict.

## Pause/Resume + Human Injection
- `resume_event` is asyncio.Event per relay (initially set, pause clears, resume sets). Checkpoints before A and B turns; on resume, history refreshed from DB. No DB schema changes — pause is transient SSE-only state.
- Human turns saved to DB with `speaker="Human"`, round inferred. Republished as `relay.turn` SSE event. `build_messages()` treats unknown speakers as "user" role.

## RPG Mode
- `mode='rpg'` on experiments table. `human_events` dict on app.state holds per-match asyncio.Event. RPG engine publishes `relay.awaiting_human` then `await human_event.wait()`; POST `/inject` calls `event.set()` to resume.
- `participants_json` stores party config. DM is Model A; Player is human; AI party members call `call_model()` with global-perspective messages.
- Campaign persistence: reuses `model_memory` table. Key overloading: `model_b = "rpg:{preset}"`. At start: fetches past summaries as "CAMPAIGN HISTORY:" in DM system prompt. At end: `_save_rpg_memory()` background task.

## Observer Model
- Optional fire-and-forget background task. Fires every N turns (configurable 1-10). Rendered inline as centered cards in Theater, not as a 3rd column.

## Experiment Forking
- `parent_experiment_id` + `fork_at_round` in experiments table. Fork flow: Theater Fork button -> `/configure/:presetId?fork=<id>` -> Configure pre-fills + sends `initial_history` + `parent_experiment_id` in POST. `initial_history` pre-populates `turns[]` before relay loop.

## Cross-Run Provenance
- `origin_experiment_id` on vocabulary table. `tag_word_origins()` bulk-UPDATE for words in child that also exist in parent (case-insensitive LOWER() match). Fired via `asyncio.create_task()` at end of `run_relay()` only when parent set. WordCard shows `[INHERITED]` badge linking to `/analytics/:origin_experiment_id`.

## N-Way Agents
- `agents_config_json` TEXT column stores JSON array of `{model, temperature, name}`. `get_agents_for_experiment(row)` parses it; falls back to model_a/model_b for old experiments. Non-self turns prefixed `[AgentName]: ` as "user" role. Speaker field: `agent_0`, `agent_1`, etc. Old DB records still have `model_a`/`model_b` — `resolveWinnerIndex()` handles both. Tournament mode still uses 2-agent path.
- `AGENT_COLORS`: `['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6']` (amber/cyan/emerald/violet). Exported from ConversationColumn.tsx.

## VocabBurstChart
- Client-side burst detection: mean + 1.5 sigma of per-round word counts. Burst bars = amber, normal = cyan. Pure SVG + ResizeObserver (no D3 enter/update/exit). Dictionary ViewMode: `'cards' | 'constellation' | 'timeline' | 'burst'`.

## BranchTree D3 Layout
- `d3.tree<TreeNode>().nodeSize([V_GAP, H_GAP])(root)` returns `HierarchyPointNode`. Horizontal orientation: svg_x = `d.y + offsetX`, svg_y = `d.x + offsetY`. Bezier edge: source right edge -> target left edge with midpoint control. Rendered in `useEffect([treeData, navigate])`.

## Personas
- `personas` table: `id TEXT PRIMARY KEY, name, personality, backstory, avatar_color (#F59E0B default), created_at`. CRUD via `/api/personas` router. Persona assigned per-agent at relay start — injection at the call site in agent loop, not inside `build_messages()`.

## Documentary
- `POST /api/experiments/{id}/documentary` is cache-first. Mode-aware prompt: standard = science journalist, RPG = fantasy chronicler. Uses `asyncio.to_thread(litellm.completion, ...)`. Max 1500 tokens, temp 0.7, `config.JUDGE_MODEL`.

## Serena Gotcha
- `.*` in Serena replace_content regex (DOTALL mode) matches newlines — can greedily consume the rest of the file. Use literal mode or specific anchor text instead.
