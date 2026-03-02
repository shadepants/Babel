# 007 — Community Experiment Library

## Problem
Interesting experiment configurations exist only on the user's machine. There is no way to share
a setup that produced surprising results, discover what others have tried, or replicate a specific
configuration from a recommendation. The preset system covers common templates but not
user-invented configurations.

## Goal
Let users publish their experiment *configs* (not transcripts — configs only) to a shared library
with a one-liner description. Others can browse and clone with one click.

## Proposed Solution

### What gets published
Config-only: preset, models, feature flags (scoring, echo, audit, agendas, observer), rounds,
temperature, hypothesis (optional). Never: actual turn content, API keys, user identifiers.

### Storage options (pick one for MVP)
**Option A — Local file export/import (no server needed)**
- "Export config" button generates a JSON file + a `babel://` URI scheme link.
- "Import config" button accepts the JSON or URI.
- Community sharing happens via Discord/GitHub — Babel just handles the codec.
- Pro: zero infrastructure. Con: friction.

**Option B — GitHub Gist backend (recommended for MVP)**
- "Publish" button POSTs the config JSON to the GitHub Gist API (user provides a PAT once,
  stored in localStorage).
- Babel fetches a curated `community-index.json` from a known GitHub repo listing popular gists.
- "Browse Library" page shows cards; "Clone" pre-fills Configure.
- Pro: free hosting, version history. Con: requires GitHub account.

**Option C — Babel-hosted endpoint**
- Requires backend + auth + moderation. Defer to v2.

### UI
- "Publish" button on Theater page (completed experiments only).
- "Library" nav item showing community configs, sortable by preset/feature flags.
- Each card: preset emoji + name, models used, active features, one-line description, "Clone" CTA.

## Alternatives Considered
- **QR code sharing**: encodes config as URL param — works offline, no account needed, but QR
  codes for configs this size are unwieldy.
- **Shareable URL** (see spec 012): orthogonal — short URL shares config without publishing to
  a library. Both can coexist.

## Risks
- Gist approach ties Babel to GitHub — single point of dependency.
- Moderation: someone publishes offensive descriptions. Mitigation: configs are just JSON params,
  description field has a 140-char limit.
- Index curation: who decides what's in the featured list? Start with maintainer-curated,
  move to upvotes later.

## Files to Modify
- `ui/src/api/community.ts` — Gist API wrapper (create)
- `ui/src/pages/Library.tsx` — browse page (create)
- `ui/src/pages/Theater.tsx` — "Publish" button
- `ui/src/App.tsx` — `/library` route
- `ui/src/pages/Configure.tsx` — "Clone" pre-fill handler

## Acceptance Criteria
- [ ] "Publish" button on Theater generates a valid shareable config (no sensitive data)
- [ ] "Library" page renders community config cards
- [ ] "Clone" pre-fills Configure with all fields from the published config
- [ ] Published config validates against the RelayStartRequest schema before publishing
- [ ] No turn content, API keys, or PII included in published payload
