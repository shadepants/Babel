# BABEL IMPLEMENTATION BLUEPRINTS

This document provides exact code snippets, schemas, and logic patterns for the tasks defined in `IMPLEMENTATION_PLAN.md`.

---

## [PHASE A] SECURITY & UI SAFETY

### [TASK A1] Dynamic Share Password (`server/app.py`)
Replace the static `SHARED_PASSWORD` logic with a dynamic generator to prevent unauthorized access in `SHARE_MODE`.

```python
# In server/app.py within create_app() -> if os.getenv("SHARE_MODE"):
import secrets
import string

SHARED_PASSWORD = os.getenv("SHARE_PASSWORD")
if not SHARED_PASSWORD or SHARED_PASSWORD == "babel123":
    # Generate a random 12-char secure string
    alphabet = string.ascii_letters + string.digits
    SHARED_PASSWORD = ''.join(secrets.choice(alphabet) for _ in range(12))
    logger.warning("
" + "="*60 + 
                   f"
SECURITY ALERT: SHARE_MODE active with default password."
                   f"
DYNAMIC ACCESS KEY GENERATED: {SHARED_PASSWORD}"
                   "
" + "="*60)
```

### [TASK A2] SVG ID Collision Guard (`ui/src/components/theater/SpriteAvatar.tsx`)
Ensure that multiple avatars on the same page do not share `clipPath` or `filter` IDs.

```tsx
import { useState, useEffect, useId } from 'react'

export function SpriteAvatar({ status, color, accentColor, instanceId, size = 64 }: SpriteAvatarProps) {
  const generatedId = useId()
  const clipId = `face-clip-${instanceId ?? generatedId.replace(/:/g, '')}`
  
  return (
    <svg ...>
      <defs>
        <clipPath id={clipId}>
          <rect x="8" y="14" width="48" height="44" />
        </clipPath>
      </defs>
      {/* ... */}
      <rect
        clipPath={`url(#${clipId})`}
        {/* ... */}
      />
    </svg>
  )
}
```

---

## [PHASE C] CORE RESILIENCY & PERFORMANCE

### [TASK C1] Persistent Event Buffer (`server/db.py` & `event_hub.py`)
Prevent state loss on server restart by serializing the SSE buffer to disk.

1.  **SQL Schema:**
    ```sql
    CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY,
        match_id TEXT,
        event_type TEXT,
        payload TEXT,
        timestamp TEXT
    );
    ```
2.  **App Lifespan logic:**
    ```python
    # shutdown
    events = hub.get_history(limit=1000)
    await db.save_system_events(events)
    
    # startup
    rows = await db.get_system_events(limit=1000)
    hub.hydrate(rows)
    ```

### [TASK C2] Background Writer Queue (`server/db.py`)
Refactor the database manager to handle writes asynchronously, removing the request-blocking `_write_lock`.

```python
class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self._queue = asyncio.Queue()
        self._worker_task = None

    async def connect(self):
        # ...
        self._worker_task = asyncio.create_task(self._writer_worker())

    async def _writer_worker(self):
        while True:
            sql, params, future = await self._queue.get()
            try:
                async with self._write_lock:
                    cursor = await self.db.execute(sql, params)
                    await self.db.commit()
                    future.set_result(cursor)
            except Exception as e:
                future.set_exception(e)
            finally:
                self._queue.task_done()
```

---

## [PHASE D] PHASE 17 - LAYERED CONTEXT

### [TASK D1] Asymmetric "Fog of War" Context
Enable private turns and hidden information.

1.  **SQL Migration:**
    ```sql
    ALTER TABLE turns ADD COLUMN visibility_json TEXT DEFAULT '[]';
    ```
2.  **Engine Prompt Filter:**
    ```python
    # In relay_engine.py -> _build_prompt
    def filter_turns(turns, agent_name):
        return [
            t for t in turns 
            if not t['visibility_json'] 
            or t['visibility_json'] == '[]'
            or agent_name in json.loads(t['visibility_json'])
            or "DM" in json.loads(t['visibility_json']) # DM sees all
        ]
    ```

### [TASK D2] Background Summarizer Engine
Condense narrative history into "Cold Context".

```python
# server/summarizer_engine.py
async def generate_cold_summary(match_id, turns):
    prompt = f"Condensed Recap: {turns}"
    res = await litellm.acompletion(
        model="gemini-2.0-flash", 
        messages=[{"role": "system", "content": "Recap the narrative so far in 3 sentences."},
                  {"role": "user", "content": prompt}]
    )
    return res.choices[0].message.content
```
