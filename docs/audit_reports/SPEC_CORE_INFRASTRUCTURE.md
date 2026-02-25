# SPECIFICATION: Core Infrastructure Upgrades

## 1. Overview
This specification addresses critical performance bottlenecks, resiliency gaps, and security risks identified in the recursive audit. These changes ensure the system can handle concurrent stress testing and recover gracefully from server interruptions.

## 2. Infrastructure Upgrades

### 2.1 RPG Session Recoverability (ISSUE-001)
- **Current State:** `rpg_engine.py` uses an ephemeral `asyncio.Event` stored in `request.app.state` to yield to humans, making sessions unrecoverable on restart.
- **Implementation:**
  - Create an `rpg_state` table: `id (match_id)`, `current_speaker_index`, `is_awaiting_human`, `last_updated`.
  - On turn completion/human yield, `rpg_engine` writes its state to `rpg_state`.
  - In `relay.py` -> `recover_stale_sessions`, check if an RPG session exists in `rpg_state`. If so, reconstruct the `asyncio.Event`, reload the speaker index, and resume the loop instead of marking it "failed".

### 2.2 Global DB Write Serialization Bottleneck (ISSUE-003)
- **Current State:** A single `asyncio.Lock` in `db.py` blocks all concurrent DB writes.
- **Implementation:** 
  - Refactor `db.py` to implement a **Background Writer Queue**.
  - Use `asyncio.Queue` to buffer `INSERT` and `UPDATE` operations.
  - A dedicated background worker task processes the queue sequentially, allowing the API request threads to return immediately without waiting for disk I/O.

### 2.3 Volatile SSE History (ISSUE-002)
- **Current State:** `EventHub` stores 2000 events in memory. Restarts wipe the history, breaking `Last-Event-ID` reconnection for clients.
- **Implementation:**
  - Create a `system_events` table in SQLite.
  - On FastAPI `lifespan` shutdown, dump the `EventHub` buffer to `system_events`.
  - On startup, read the last 1000 events from `system_events` into the `EventHub` memory buffer.

## 3. Security Hardening

### 3.1 Dynamic Share Password (ISSUE-006)
- Update `server/app.py`: If `SHARE_MODE` is true but `SHARE_PASSWORD` is "babel123" or unset, dynamically generate a secure 12-character random string, log it to the console, and use it as the gate.

### 3.2 Serena Regex Safety (ISSUE-007)
- Update the internal `Serena` migration script to require strict start/end anchors when using `re.DOTALL` to prevent accidental file truncation during automated edits.
