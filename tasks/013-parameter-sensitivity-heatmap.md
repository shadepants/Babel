# 013 — Parameter Sensitivity Heatmap

## Problem
Users have intuitions about which parameters matter (temperature, model choice, rounds) but no
systematic evidence. Running the same experiment many times with a grid of parameters is tedious
and produces no aggregate visualization. Users can't answer "does temperature actually matter
for this preset?" with data.

## Goal
A "Grid Run" mode: define two parameters and their value ranges, launch N experiments
automatically covering the grid, and visualize outcomes on a 2D heatmap.

## Proposed Solution

### Grid Run configuration
Accessible from Configure page via a "Grid Run" toggle (replaces single-launch button).
- **X axis parameter**: pick from [temperature_a, temperature_b, rounds, model_a, model_b]
- **X axis values**: 3-4 values (e.g., 0.5, 0.8, 1.0, 1.3 for temperature)
- **Y axis parameter**: same picker, different param
- **Y axis values**: 3-4 values
- Total experiments = X count x Y count (max 16, enforced)
- All other parameters: same as the base config

On submit: launches all N experiments sequentially (2-second gap to avoid server overload),
creates a `grid_run` record linking all experiment IDs.

### Backend
- New `grid_runs` table: (id, name, x_param, x_values_json, y_param, y_values_json,
  config_json, experiment_ids_json, status, created_at).
- `GET /api/grid-runs/:id` — returns grid metadata + current status of all experiments.
- `GET /api/grid-runs/:id/results` — returns the outcome matrix once all experiments complete.

### Heatmap view (`/grid/:id`)
- 2D grid: X axis = first parameter, Y axis = second parameter.
- Each cell = one experiment. Color = chosen outcome metric.
- Metric selector: vocab count / avg score / winner (A=blue, B=red, tie=gray) / turns completed.
- Click any cell: opens that experiment's Theater page.
- Download button: exports the grid as a CSV.

### Outcome metrics computed
- Vocabulary coined count (from vocabulary table)
- Average judge score (from turn_scores)
- Winner (A/B/tie from experiment.winner)
- Convergence index (final Jaccard, from echo detector events if enabled)

## Alternatives Considered
- **3D parameter grids**: combinatorially expensive; cap at 2D.
- **Parallel experiment launch**: would be faster but could overload the server and the
  rate-limited APIs. Sequential with a small delay is safer.
- **Automatic metric selection**: show all metrics by default, let user switch — avoids
  forcing a pre-launch decision about what to measure.

## Risks
- 4x4 = 16 experiments can be expensive (especially with Opus or GPT-4.1). Show estimated
  cost before launch using the existing provider cost lookup.
- Long-running: 16 experiments x ~5 minutes each = ~80 minutes. Needs a clear progress
  indicator and resilience to server restarts mid-run.
- If any experiment in the grid fails, the heatmap cell shows "failed" (gray X). Grid run
  continues for the remaining cells regardless.

## Files to Modify
- `server/db.py` — `grid_runs` table, helpers
- `server/routers/grid_runs.py` — CRUD + launch endpoint (create)
- `server/app.py` — mount grid runs router
- `ui/src/pages/Configure.tsx` — Grid Run toggle + config panel
- `ui/src/pages/GridRun.tsx` — heatmap view (create)
- `ui/src/components/Heatmap.tsx` — D3 heatmap component (create)
- `ui/src/App.tsx` — `/grid/:id` route

## Acceptance Criteria
- [ ] User can configure a 2D grid (2 params, 2-4 values each) from Configure page
- [ ] Grid launches all experiments sequentially with 2s gap; progress shown per-cell
- [ ] Heatmap renders once all experiments complete, with color-coded outcome metric
- [ ] Metric selector switches between vocab count, avg score, winner, convergence
- [ ] Clicking a cell navigates to that experiment's Theater page
- [ ] Failed experiments show a gray X cell; grid run still completes
- [ ] CSV export of the full results matrix works
