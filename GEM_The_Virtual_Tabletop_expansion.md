The Virtual Tabletop expansion transforms the symmetric AI relay into an asymmetric, multi-agent RPG engine with human-in-the-loop capabilities. This requires a sibling execution loop (`server/rpg_engine.py`) that pauses background execution via an `asyncio.Event` to await human input from a dedicated REST endpoint, while the React frontend dynamically routes to a specialized layout displaying the DM, the Party, and a command input field. Token streaming is deferred to maintain stability with the existing LiteLLM chunked response architecture, and automated RNG tool-calling is deferred until the core human-pause synchronization is verified.

### 1. Database Schema Expansion

Alter the existing SQLite schema to support multi-agent arrays and semantic turn data without breaking standard relay runs.

```sql
-- server/db.py modifications
ALTER TABLE experiments ADD COLUMN mode TEXT DEFAULT 'standard';
ALTER TABLE experiments ADD COLUMN participants_json TEXT;
ALTER TABLE turns ADD COLUMN metadata TEXT;

```

### 2. The RPG Engine Core (`server/rpg_engine.py`)

Create a dedicated engine utilizing a queue for initiative and an `asyncio.Event` to yield execution to the human player.

```python
import asyncio
import logging
from server.event_hub import EventHub

logger = logging.getLogger(__name__)

async def run_rpg_match(match_id: str, participants: list[dict], hub: EventHub, db, human_event: asyncio.Event):
    turns = []
    
    try:
        # Simplified initiative loop
        for round_num in range(1, 10):
            for actor in participants:
                if actor["role"] == "Human":
                    hub.publish("relay.awaiting_human", {"match_id": match_id, "round": round_num})
                    await human_event.wait() # Pause background task
                    human_event.clear()      # Reset lock for next turn
                    
                    # Fetch the injected turn from DB to append to context
                    latest_turn = await db.get_latest_turn(match_id)
                    turns.append({"speaker": "Human", "content": latest_turn["content"]})
                    continue

                # AI Turn logic
                hub.publish("relay.thinking", {"match_id": match_id, "speaker": actor["name"]})
                # ... call_model() execution ...
                # ... db.add_turn() ...
                # ... hub.publish("relay.turn") ...

    except Exception as e:
        logger.error(f"RPG Engine failed: {e}")
        hub.publish("relay.error", {"match_id": match_id, "message": str(e)})

```

### 3. Human Injection Router (`server/routers/relay.py`)

Provide the REST endpoint for the frontend to submit actions and release the engine lock.

```python
from pydantic import BaseModel
from fastapi import APIRouter, Request

class InjectTurnRequest(BaseModel):
    match_id: str
    content: str
    speaker: str = "Human"

@router.post("/inject")
async def inject_human_turn(body: InjectTurnRequest, request: Request):
    db = _get_db(request)
    
    # 1. Save the human action directly to the DB
    turn_id = await db.add_turn(
        experiment_id=body.match_id,
        round_num=0, # Engine resolves exact round contextually
        speaker=body.speaker,
        model="human",
        content=body.content
    )
    
    # 2. Release the lock on the specific match's background task
    app_state = request.app.state
    if hasattr(app_state, "active_human_events") and body.match_id in app_state.active_human_events:
        app_state.active_human_events[body.match_id].set()
        
    return {"status": "injected", "turn_id": turn_id}

```

### 4. Tabletop UI Layout (`ui/src/components/theater/RPGTheater.tsx`)

Shift from split-column to a centralized log with anchored UI regions.

```tsx
import React from 'react';
import { useRelayStream } from '../../api/hooks';
import { HumanInput } from './HumanInput';

export function RPGTheater({ matchId }) {
  const { turns, statusA, statusB, isWaitingHuman } = useRelayStream(matchId);

  return (
    <div className="grid grid-cols-4 h-screen bg-slate-950">
      {/* Left Sidebar: The Party (AI + Human stats) */}
      <div className="col-span-1 border-r border-slate-800 p-4">
         {/* Render AI party sprites mapping to statusA, statusB */}
      </div>
      
      {/* Center: The DM & Chat Log */}
      <div className="col-span-3 flex flex-col relative">
        <div className="h-24 border-b border-slate-800 flex items-center justify-center">
          {/* DM Sprite */}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          {turns.map(turn => (
            <div key={turn.id} className="mb-4 text-slate-200">
              <span className="font-bold text-emerald-400">{turn.speaker}: </span>
              <span>{turn.content}</span>
            </div>
          ))}
        </div>

        {/* Bottom Fixed: Human Input */}
        <div className="absolute bottom-0 w-full p-4 bg-slate-900 border-t border-slate-800">
           <HumanInput matchId={matchId} isEnabled={isWaitingHuman} />
        </div>
      </div>
    </div>
  );
}

```

### 5. Interactive Input State (`ui/src/api/hooks.ts` delta)

Extend the existing SSE hook to parse the `awaiting_human` state.

```typescript
// Add to useRelayStream state declarations
const [isWaitingHuman, setIsWaitingHuman] = useState(false);

// Add to the switch(data.type) block in the EventSource onmessage handler
case 'relay.awaiting_human':
  setIsWaitingHuman(true);
  setStatusA('idle');
  setStatusB('idle');
  break;

// Update 'relay.turn' case to reset the lock
case 'relay.turn':
  setIsWaitingHuman(false);
  // ... existing turn append logic

```

### Feature Breakdown: Virtual Tabletop Expansion

This implementation establishes the RPG mode as an isolated backend pathway. Standard AI-to-AI relays remain untouched.

**Deferred:** The React UI rendering (`RPGTheater.tsx` and `HumanInput.tsx`) is deferred until this backend API surface is wired and verified.
**Why:** The frontend requires the `/inject` endpoint and the `relay.awaiting_human` SSE event to exist before state management can be implemented.

### 1. Lifespan State Update (`server/app.py` Delta)

To pause the async background task across different HTTP requests, the FastAPI app must track `asyncio.Event` locks globally.

```python
# Delta: server/app.py
# Add to the lifespan() function before `yield`

    app.state.db = db
    app.state.hub = hub
    
    # NEW: Track human-in-the-loop locks per match_id
    app.state.human_events = {} 

    logger.info("Babel started — database connected, event hub ready")
    yield

```

### 2. Database Schema Expansion (`server/db.py` Delta)

The schema requires non-destructive additions to track the execution mode and multi-agent configurations.

```python
# Delta: server/db.py
# Update the _SCHEMA string constants:

_SCHEMA = """
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    model_a TEXT,                     -- Made nullable for RPG mode
    model_b TEXT,                     -- Made nullable for RPG mode
    mode TEXT DEFAULT 'standard',     -- 'standard' or 'rpg'
    participants_json TEXT,           -- Array of agent configs for RPG
    preset TEXT,
    seed TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    rounds_planned INTEGER,
    rounds_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',
    elapsed_seconds REAL,
    config_json TEXT
);

CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    speaker TEXT NOT NULL,
    model TEXT NOT NULL,
    content TEXT NOT NULL,
    latency_seconds REAL,
    token_count INTEGER,
    metadata TEXT,                    -- JSON for dice rolls, HP, etc.
    created_at TEXT NOT NULL
);
"""
# Note: You will need to add mode, participants_json, and metadata to the respective INSERT queries in create_experiment() and add_turn().

```

### 3. The RPG Engine (`server/rpg_engine.py`)

This is a complete, new file. It handles the turn queue and yields to the `asyncio.Event` lock when a human turn is detected.

```python
"""RPG Engine — runs asymmetric, multi-agent campaigns with human yielding."""

import asyncio
import logging
import time
from typing import Any

from server.event_hub import EventHub
from server.relay_engine import call_model, RelayAgent, build_messages

logger = logging.getLogger(__name__)

async def run_rpg_match(
    match_id: str,
    participants: list[dict], # e.g., [{"name": "DM", "model": "...", "role": "dm"}, {"name": "Player 1", "model": "human", "role": "player"}]
    seed: str,
    system_prompt: str,
    rounds: int,
    hub: EventHub,
    db: Any,
    human_event: asyncio.Event,
) -> None:
    turns: list[dict] = []
    seed_turn = {"speaker": "System", "content": seed}
    start_time = time.time()

    try:
        for round_num in range(1, rounds + 1):
            for actor in participants:
                # ── Human Turn Yielding ──
                if actor["model"] == "human":
                    hub.publish("relay.awaiting_human", {
                        "match_id": match_id,
                        "speaker": actor["name"],
                        "round": round_num,
                    })
                    
                    # Pause execution until POST /inject clears this lock
                    await human_event.wait()
                    human_event.clear()
                    
                    # Fetch the injected turn to maintain context history
                    db_turns = await db.get_turns(match_id)
                    latest_turn = db_turns[-1]
                    turns.append({"speaker": actor["name"], "content": latest_turn["content"]})
                    continue

                # ── AI Turn Execution ──
                hub.publish("relay.thinking", {
                    "match_id": match_id,
                    "speaker": actor["name"],
                    "model": actor["model"],
                    "round": round_num,
                })

                agent = RelayAgent(name=actor["name"], model=actor["model"])
                
                # In RPGs, AI must see the global context, not symmetric opposing views
                messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": seed}]
                for t in turns:
                    role = "assistant" if t["speaker"] == actor["name"] else "user"
                    prefix = "" if role == "assistant" else f"[{t['speaker']}]: "
                    messages.append({"role": role, "content": f"{prefix}{t['content']}"})

                content, latency = await call_model(agent, messages)
                turns.append({"speaker": actor["name"], "content": content})
                
                turn_id = await db.add_turn(
                    experiment_id=match_id,
                    round_num=round_num,
                    speaker=actor["name"],
                    model=actor["model"],
                    content=content,
                    latency_seconds=latency,
                )

                hub.publish("relay.turn", {
                    "match_id": match_id,
                    "round": round_num,
                    "speaker": actor["name"],
                    "model": actor["model"],
                    "content": content,
                    "latency_s": round(latency, 1),
                    "turn_id": turn_id,
                })

            hub.publish("relay.round", {"match_id": match_id, "round": round_num})
            await db.update_experiment_status(match_id, "running", rounds_completed=round_num)

        elapsed = time.time() - start_time
        await db.update_experiment_status(match_id, "completed", rounds_completed=rounds, elapsed_seconds=round(elapsed, 1))
        hub.publish("relay.done", {"match_id": match_id, "rounds": rounds, "elapsed_s": round(elapsed, 1)})

    except Exception as e:
        logger.error("RPG Engine failed: %s", e)
        hub.publish("relay.error", {"match_id": match_id, "message": str(e)})

```

### 4. Router Endpoints (`server/routers/relay.py` Delta)

Updates `/start` to branch based on `mode` and introduces `/inject` to release the lock.

```python
# Delta: server/routers/relay.py
# 1. Add 'mode' to Request Model
class RelayStartRequest(BaseModel):
    # ... existing fields ...
    mode: str = Field(default="standard", description="'standard' or 'rpg'")
    participants: list[dict] | None = Field(default=None, description="Array of agents for RPG mode")

class InjectTurnRequest(BaseModel):
    match_id: str
    speaker: str
    content: str

# 2. Update start_relay branching
@router.post("/start", response_model=RelayStartResponse)
async def start_relay(body: RelayStartRequest, request: Request):
    db = _get_db(request)
    hub = _get_hub(request)

    # ... db.create_experiment mapping ...

    if body.mode == "rpg" and body.participants:
        # Create lock and register it globally
        human_event = asyncio.Event()
        request.app.state.human_events[match_id] = human_event
        
        from server.rpg_engine import run_rpg_match
        asyncio.create_task(run_rpg_match(
            match_id=match_id,
            participants=body.participants,
            seed=body.seed,
            system_prompt=body.system_prompt,
            rounds=body.rounds,
            hub=hub,
            db=db,
            human_event=human_event
        ))
    else:
        # Standard symmetric execution
        asyncio.create_task(run_relay(...))

    return RelayStartResponse(...)

# 3. Add Inject Endpoint
@router.post("/inject")
async def inject_human_turn(body: InjectTurnRequest, request: Request):
    """Inserts a human turn into the DB and resumes the paused RPG engine."""
    db = _get_db(request)
    
    turn_id = await db.add_turn(
        experiment_id=body.match_id,
        round_num=0, # Engine tracks actual round
        speaker=body.speaker,
        model="human",
        content=body.content
    )
    
    # Release the engine lock
    events = getattr(request.app.state, "human_events", {})
    if body.match_id in events:
        events[body.match_id].set()
        
    return {"status": "injected", "turn_id": turn_id}

```