# 010 — Longitudinal Campaign Mode

## Problem
Each Babel experiment is a one-off: it runs, finishes, and sits in the gallery. The linguistic
evolution chaining (vocabulary_seed_id) exists but requires manual triggering. There is no way
to define a multi-week arc where experiment outcomes automatically feed the next session, creating
genuine long-term evolution without user intervention.

## Goal
A "Campaign" is a scheduled sequence of experiments where each session's top-coined vocabulary
and key outcomes automatically seed the next session. Campaigns run on a schedule (daily, weekly)
and accumulate a lineage tree over time.

## Proposed Solution

### Campaign definition
- Name, description, base preset, model pair, feature flags (same as a normal experiment config).
- Schedule: manual-only / daily / weekly / every N experiments.
- Seed evolution strategy: "use previous session's top-5 new vocab words" / "use previous
  session's winner's last turn as seed" / custom template.
- Max sessions: e.g., run for 10 sessions then mark campaign as complete.

### Storage
- New `campaigns` table: (id, name, config_json, schedule, next_run_at, sessions_completed,
  max_sessions, status, created_at).
- `experiments.campaign_id` FK links each session to its campaign.
- Campaign tracks its experiment lineage via the existing `vocabulary_seed_id` chain.

### Scheduler
- Background `asyncio` task in the server checks `next_run_at` every hour.
- When due: fetch the previous session's vocabulary, build the next seed, launch via the
  relay engine, update `next_run_at`.
- Graceful: if server was offline and missed a scheduled run, catches up (runs the missed
  session on next startup).

### Campaign view (`/campaigns`)
- Timeline view: each session is a node on a horizontal timeline, connected by arrows.
- Click a node: opens that session's Theater page.
- Vocabulary growth chart: total unique words coined over sessions.
- "Run now" override button for manual campaigns.

### Seed building logic
```python
def build_campaign_seed(prev_experiment_id: str, strategy: str) -> str:
    vocab = db.get_vocabulary(prev_experiment_id)[:5]
    words = [f"{v['word']} ({v['definition']})" for v in vocab]
    return f"Continue building on these established terms: {', '.join(words)}. ..."
```

## Alternatives Considered
- **Cron-based external scheduler**: simpler but requires a separate process; in-process asyncio
  is cleaner for a single-user app.
- **Manual-only chaining (no schedule)**: lose the "automatic" value proposition; downgrade to
  v2 if scheduling proves too complex.

## Risks
- If the server is not running at scheduled time, sessions are missed. Mitigation: catch-up on
  startup, and show "missed sessions" badge in campaign timeline.
- Campaigns running on autopilot cost money without user awareness — add daily spend estimation
  on campaign setup, and an email/notification hook (future work) for completion.
- Vocabulary seed may degenerate: if the same words keep winning, the language stops evolving.
  Mitigation: add a "minimum novelty" check — if < 2 new words were coined, inject a random
  chaos seed instead.

## Files to Modify
- `server/db.py` — `campaigns` table, FK on experiments, campaign CRUD helpers
- `server/routers/campaigns.py` — CRUD + run-now endpoint (create)
- `server/app.py` — mount campaigns router, start background scheduler
- `server/campaign_scheduler.py` — scheduler task + seed builder (create)
- `ui/src/pages/Campaigns.tsx` — campaign list + create (create)
- `ui/src/pages/CampaignDetail.tsx` — timeline view (create)
- `ui/src/App.tsx` — campaign routes

## Acceptance Criteria
- [ ] User can define a campaign with preset, models, schedule, and max sessions
- [ ] Campaign auto-launches next session when due, using previous vocab as seed
- [ ] Campaign timeline shows all sessions with vocab growth chart
- [ ] "Run now" triggers an immediate session outside the schedule
- [ ] Campaign pauses if max_sessions is reached, with a "complete" badge
- [ ] Server restart does not lose campaign state or miss catch-up runs
