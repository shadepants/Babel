# 014 — Experiment Templates as Shareable URLs

## Problem
There is no frictionless way to share an interesting experiment setup. Sharing requires
describing the config in text (Discord, GitHub issue, etc.) and the recipient must manually
re-enter every field. This kills casual experimentation sharing and prevents "replicate this"
conversations.

## Goal
Encode a full experiment config as a compact shareable URL or short code. Anyone with the link
can open Babel, see the config pre-filled, and launch with one click.

## Proposed Solution

### URL encoding
Config JSON is base64url-encoded and appended to the Configure page URL:
`/configure?c=<base64url-encoded-json>`

On page load, if `?c=` is present, decode and pre-fill all fields. Show a banner:
"Config loaded from shared link. Review and launch when ready."

The URL can be long (configs are ~1KB). Acceptable for most sharing surfaces.

### Short code alternative (server-side)
- `POST /api/templates` — stores config JSON, returns a 6-character alphanumeric code.
- `GET /api/templates/:code` — returns the config JSON.
- Short URL: `localhost:5173/t/:code` or `babel.app/t/:code` if hosted.
- Codes stored in a lightweight `templates` table (id, code, config_json, created_at).
- No auth, no expiry for MVP (codes are permanent).

### UI surfaces
- "Share config" button in Configure (before launch) — generates the URL/code and copies to
  clipboard.
- "Share config" button in Theater (completed experiments) — shares the config that *was used*,
  not the transcript.
- Import: Configure page banner when arriving via `?c=` or `/t/:code`.

### What is included in the shared config
All RelayStartRequest fields EXCEPT: `initial_history`, `parent_experiment_id`,
`vocabulary_seed_id` (these are local experiment references that won't exist on the recipient's
instance). Preset seed and system_prompt included verbatim if they were customized.

## Alternatives Considered
- **QR codes**: good for in-person sharing; generate client-side from the base64url. Add as a
  secondary option ("Show QR") in the share modal.
- **URL shortener via external service (bit.ly etc.)**: adds external dependency and privacy
  concern; avoid.
- **Export as JSON file**: lower friction than re-entry but higher than a URL. Add alongside
  the URL option.

## Risks
- Base64url URLs can be very long for complex configs with long seeds/system prompts.
  Mitigation: truncate seed/system_prompt at 500 chars in the URL version; use short codes for
  full configs.
- Short code namespace is small (6 chars alphanumeric = 2.2B combos) — sufficient for a
  single-user or small-community tool.
- Shared configs reference model IDs that might not be in the recipient's registry — show a
  validation warning if a referenced model is not available.

## Files to Modify
- `server/db.py` — `templates` table (lightweight, optional if URL-only)
- `server/routers/templates.py` — `POST /api/templates`, `GET /api/templates/:code` (create)
- `server/app.py` — mount templates router
- `ui/src/pages/Configure.tsx` — share button + `?c=` decode on load + `/t/:code` resolve
- `ui/src/components/ShareModal.tsx` — share UI: copy URL, copy code, QR (create)
- `ui/src/App.tsx` — `/t/:code` redirect route

## Acceptance Criteria
- [ ] "Share config" button in Configure copies a valid URL to clipboard
- [ ] Navigating to the shared URL pre-fills Configure with all fields from the config
- [ ] Short code alternative works: `POST /api/templates` returns 6-char code, `GET` retrieves it
- [ ] Validation warning shown if a referenced model is not in the current registry
- [ ] Share from Theater uses the config of the completed experiment (not current Configure state)
- [ ] QR code shown in share modal (client-side generation, no external API)
