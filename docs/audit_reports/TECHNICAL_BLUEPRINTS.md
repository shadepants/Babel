# TECHNICAL BLUEPRINTS: Code & Schema Patterns

These snippets provide the "surgical" logic for the tasks in `TASK_SPRINTS.md`.

## 1. Database Schema Additions
```sql
-- Resiliency (C1a, C3a)
CREATE TABLE IF NOT EXISTS system_events (id INTEGER PRIMARY KEY, match_id TEXT, event_type TEXT, payload TEXT, timestamp REAL);
CREATE TABLE IF NOT EXISTS rpg_state (match_id TEXT PRIMARY KEY, current_round INTEGER, current_speaker_idx INTEGER, is_awaiting_human INTEGER, participants_json TEXT, last_updated TEXT);

-- Phase 17 Context (D3a)
CREATE TABLE IF NOT EXISTS cold_summaries (id INTEGER PRIMARY KEY, match_id TEXT, through_round INTEGER, summary TEXT, created_at TEXT, UNIQUE(match_id, through_round));
CREATE TABLE IF NOT EXISTS world_state (match_id TEXT PRIMARY KEY, state_json TEXT, updated_at TEXT);
ALTER TABLE turns ADD COLUMN visibility_json TEXT DEFAULT '[]';
```

## 2. Dynamic Security (A1)
```python
# server/app.py
if os.getenv("SHARE_MODE"):
    SHARED_PASSWORD = os.getenv("SHARE_PASSWORD")
    if not SHARED_PASSWORD or SHARED_PASSWORD == "babel123":
        SHARED_PASSWORD = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        logger.warning(f"DYNAMIC ACCESS KEY GENERATED: {SHARED_PASSWORD}")
```

## 3. Asymmetric Filter (D1b)
```python
# server/relay_engine.py
def filter_turns_for_agent(turns: list[dict], agent_name: str) -> list[dict]:
    return [t for t in turns if not json.loads(t.get("visibility_json", "[]")) or agent_name in json.loads(t["visibility_json"])]
```

## 4. Port-Based Process Kill (F1)
```powershell
# kill_python.ps1
param([int]$Port = 8000)
$target = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($target) { Stop-Process -Id $target.OwningProcess -Force }
```

## 5. React useId() Guard (A2)
```tsx
// SpriteAvatar.tsx
const generatedId = useId().replace(/:/g, '')
const clipId = `face-clip-${instanceId ?? generatedId}`
// Use url(#${clipId}) in SVG
```
