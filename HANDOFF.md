# AI Agent Handoff Protocol

## Current Session Status
**Last Updated:** 2026-02-23 (Session 11)
**Active Agent:** Claude Code
**Current Goal:** Phase 15 complete (N-way conversations + Branch Tree)

## What Was Done This Session

### Phase 15-A Backend: N-Way Conversations
- `server/db.py`:
  - Idempotent migration: `agents_config_json TEXT` on experiments table
  - `create_experiment()` accepts `agents: list[dict] | None`; serializes to JSON; populates model_a/model_b from agents[0]/[1] for backward compat
  - `get_agents_for_experiment(row)` helper: parses agents_config_json if set, else builds 2-agent list from model_a/model_b
  - `get_experiment_tree(root_id)`: recursive CTE query returning nested TreeNode dict
- `server/relay_engine.py`:
  - `run_relay()` signature: `agents: list[RelayAgent]` replaces agent_a/agent_b (backward compat shim kept)
  - Relay loop: `for round in 1..rounds: for (idx, agent) in enumerate(agents):`
  - `build_messages()`: non-self turns prefixed `[AgentName]: ` as "user" role; self turns as "assistant"
  - `speaker` in SSE events: `"agent_0"`, `"agent_1"`, etc. (replaces `"model_a"`, `"model_b"`)
  - `final_verdict()`: valid winners extended to `["agent_0", "agent_1", ..., "tie"]`
- `server/routers/relay.py`:
  - `AgentConfig` Pydantic model: `{model, temperature, name}`
  - `RelayStartRequest`: `agents: list[AgentConfig] | None`; old model_a/b/temp fields kept optional for backward compat
  - POST `/start`: if `agents` provided use directly; else auto-convert from old fields
- `server/routers/experiments.py`:
  - New `GET /api/experiments/{id}/tree` endpoint: calls `db.get_experiment_tree(id)`

### Phase 15-A Frontend: N-Way Theater + Configure
- `ui/src/api/types.ts`:
  - Added `AgentConfig { model, temperature, name? }`
  - `RelayStartRequest.agents?: AgentConfig[]`; model_a/b/temp fields now optional
  - `VerdictEvent.winner` widened from union to `string`
  - `ExperimentRecord.agents_config_json?: string | null`
  - Added `TreeNode` interface (id, label, status, model_a, model_b, rounds, fork_at_round, preset, children)
- `ui/src/api/client.ts`: added `getExperimentTree(id)` method
- `ui/src/components/theater/ConversationColumn.tsx`:
  - Exports `AGENT_COLORS = ['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6']`
  - New `agentIndex: number` prop (required); `color` deprecated
  - Dynamic border/glow via `AGENT_COLORS[agentIndex]` inline styles
- `ui/src/components/theater/SpriteAvatar.tsx`:
  - Added `accentColor?: string` (overrides color-derived accent)
  - Added `instanceId?: string` (parameterizes SVG clipPath id to prevent DOM collision with N sprites)
- `ui/src/components/theater/ArenaStage.tsx`: full rewrite
  - N-agent support: 2 agents = VS divider layout; 3+ = no divider, row with `justify-around`
  - Props: `agents?: AgentStageSlot[]` (preferred) + legacy props kept
- `ui/src/pages/Theater.tsx`: full rewrite
  - `parseAgents()` helper: parses agents_config_json, falls back to legacy model_a/model_b
  - `resolveWinnerIndex()`: handles both "agent_0"/"agent_1" (new) and "model_a"/"model_b" (legacy)
  - Dynamic grid: `style={{ gridTemplateColumns: repeat(N, 1fr) }}`
  - N-column ConversationColumn render loop
  - Tree link button (violet, visible when parent_experiment_id set)
- `ui/src/pages/Configure.tsx`: full rewrite
  - State: `agents: AgentSlot[]` (default 2) replaces modelA/modelB/temperatureA/temperatureB
  - Per-agent temperature card; Add Agent (max 4) / Remove (min 2) buttons
  - AGENT_COLORS[idx] labels; estimate bar scales with agent count

### Phase 15-B: Branch Tree
- `ui/src/pages/BranchTree.tsx` (NEW):
  - D3 tree layout (horizontal, root-left, children-right)
  - Nodes: status-colored border, preset glow tint, label/ID, model A (amber) + model B (cyan), round counter R{n}/{planned}
  - Edges: cubic bezier, preset-tinted stroke, "fork @ R{n}" labels
  - Click node: navigate to /analytics/:id
  - Fork > button: navigate to /configure/:preset?fork=:id (stopPropagation)
  - HUD bracket frame + "// BRANCH TREE" section label
- `ui/src/App.tsx`: added `/tree/:experimentId` route + violet tint for `/tree` prefix
- `ui/src/pages/Analytics.tsx`: "View Tree" button (violet) visible when parent_experiment_id set

## Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Python syntax | PASSED | py_compile on all 4 backend files: db.py, relay_engine.py, routers/relay.py, routers/experiments.py |
| TypeScript | PASSED | tsc --noEmit exits 0, zero errors |
| Runtime test | NOT RUN | Server not started this session |
| Git commit | PENDING | Phase 14 + Phase 15 changes not yet committed |

## Next Steps (Priority Order)

1. [ ] **Kill zombie Python processes** (Task Manager > Details if any python.exe still running from last session)
2. [ ] **Commit Phase 14 + 15** -- large staged commit or two separate commits
3. [ ] **Runtime smoke test** -- start server, test 3-way Configure launch, Theater 3-column render, branch tree
4. [ ] **2-way backward compat check** -- old experiments still load in Theater (legacy speaker strings)
5. [ ] **RPG smoke test** -- test RPG flow end-to-end (deferred since session 9)
6. [ ] **RPG SAO metadata** -- prompt DM to emit SAO events; parse into metadata column

## Key Patterns (carry forward)

- **AGENT_COLORS**: `['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6']` (amber/cyan/emerald/violet) -- exported from ConversationColumn.tsx
- **Dynamic Tailwind grid**: use `style={{ gridTemplateColumns: 'repeat(N, 1fr)' }}` -- NOT `grid-cols-${n}` (purged in prod)
- **Speaker name format**: relay engine now emits `agent_0`, `agent_1`, etc. Old DB records have `model_a`, `model_b`. `resolveWinnerIndex()` handles both.
- **SpriteAvatar instanceId**: with N sprites, SVG clipPath IDs must be unique. Pass `instanceId={String(idx)}` to each.
- **D3 tree horizontal**: d3.tree() puts root at d.y=0, children extend rightward. Horizontal SVG: `svg_x = d.y + offset`, `svg_y = d.x + offset`. Cubic bezier from source right edge to target left edge.
- **SSE-first / DB-fallback**: effectiveX = sseX.length > 0 ? sseX : dbX
- **Idempotent migrations**: try/except on ALTER TABLE ADD COLUMN
- **win_write + HTML entities**: never raw Unicode in JSX; use \uXXXX escapes in JS strings

## Zombie Python Processes Warning
PowerShell CANNOT kill litellm zombie processes. Must use Task Manager > Details > kill all python.exe manually.
After killing, server starts normally. See MEMORY.md for permanent Defender exclusion fix.
