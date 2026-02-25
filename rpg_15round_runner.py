"""
rpg_15round_runner.py -- Single focused 15-round RPG session.

Hardened version:
  - Safe SQLite handling (context managers)
  - NoneType safety for latency/tokens
  - Modular constants and main() guard
  - Retry on transient API startup errors
"""

import sqlite3
import time
import json
import urllib.request
from pathlib import Path

# --- Constants -------------------------------------------------------------
ROUNDS      = 15
MAX_TOKENS  = 350
TURN_DELAY  = 0
TIMEOUT_SEC = 900
API         = "http://localhost:8000/api"
DB_PATH     = Path(".babel_data/babel.db")
OUT_DIR     = Path("gameplay-observations/session-logs")

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def api_get(path):
    with urllib.request.urlopen(f"{API}{path}", timeout=15) as r:
        return json.loads(r.read())


def api_post(path, data):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(
        f"{API}{path}", data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def pick_first(candidates, available):
    """Return the first candidate that is in the available model list."""
    for c in candidates:
        if c in available:
            return c
    return available[0] if available else None


def wait_for_completion(match_id, t_start, timeout=TIMEOUT_SEC):
    """Poll DB directly -- avoids SSE connection overhead."""
    deadline = time.time() + timeout
    last_round = 0

    while time.time() < deadline:
        try:
            with sqlite3.connect(str(DB_PATH)) as conn:
                row = conn.execute(
                    "SELECT status, rounds_completed FROM experiments WHERE id=?",
                    (match_id,),
                ).fetchone()

            if row:
                current_round = row[1] or 0
                if current_round != last_round:
                    last_round = current_round
                    elapsed = time.time() - t_start
                    bar = "#" * current_round + "." * (ROUNDS - current_round)
                    print(f"  [{bar}] round {current_round:>2}/{ROUNDS}  ({elapsed:.0f}s)")

                if row[0] in ("completed", "failed", "stopped"):
                    return row[0], last_round
        except sqlite3.Error as e:
            print(f"  [DB_WAIT_WARN] {e}")

        time.sleep(4)

    return "timeout", last_round


def get_turns(match_id):
    try:
        with sqlite3.connect(str(DB_PATH)) as conn:
            turns = conn.execute(
                "SELECT round, speaker, content, latency_seconds "
                "FROM turns WHERE experiment_id=? ORDER BY round, id",
                (match_id,),
            ).fetchall()
        return turns
    except sqlite3.Error as e:
        print(f"ERROR: Failed to fetch turns from DB: {e}")
        return []


def save_log(match_id, dm_model, npc_model, hook, status, rounds_done, turns):
    lines = [
        "# Session: The Obsidian Vault",
        f"**Match ID:** {match_id}",
        f"**Date:** {time.strftime('%Y-%m-%d %H:%M')}",
        f"**Status:** {status}  ({rounds_done}/{ROUNDS} rounds)",
        f"**DM model:**  {dm_model}",
        f"**NPC model:** {npc_model}",
        f"**Hook:** {hook}",
        "",
        "---",
        "",
    ]

    current_round = 0
    for rnd, speaker, content, latency in turns:
        lat_val = latency if latency is not None else 0.0
        if rnd != current_round:
            current_round = rnd
            lines.append(f"\n## Round {rnd}\n")
        lines.append(f"### {speaker} ({lat_val:.1f}s)\n\n{content}\n")

    lines.append("\n---\n\n## Observations\n\n*(to be filled)*\n")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fname = OUT_DIR / f"{match_id}-obsidian-vault.md"
    fname.write_text("\n".join(lines), encoding="utf-8")
    return fname


# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("RPG 15-Round Runner -- The Obsidian Vault")
    print("=" * 60)
    print()
    
    # 1. Fetch models with retry
    available = []
    print(f"Verifying backend connectivity at {API}...")
    for attempt in range(5):
        try:
            models_data = api_get("/relay/models")
            available = [m["model"] for m in models_data["models"]]
            if available:
                print("  [OK] Backend online.")
                break
        except Exception as e:
            if attempt < 4:
                print(f"  [WAIT] Backend not ready, retrying in 5s... ({e})")
                time.sleep(5)
            else:
                raise SystemExit(f"ERROR: Cannot reach server at {API} after 5 attempts.")

    if not available:
        raise SystemExit("ERROR: No models configured. Add at least one API key to .env")

    DM_MODEL = pick_first([
        "gemini/gemini-2.5-flash",
        "anthropic/claude-haiku-4-5-20251001",
        "groq/llama-3.3-70b-versatile",
        "openai/gpt-4o-mini",
    ], available)

    NPC_MODEL = pick_first([
        "groq/llama-3.3-70b-versatile",
        "anthropic/claude-haiku-4-5-20251001",
        "gemini/gemini-2.5-flash",
        "openai/gpt-4o-mini",
    ], available)

    print(f"  DM  -> {DM_MODEL}")
    print(f"  NPC -> {NPC_MODEL}")
    print()

    # 2. Session Setup
    CAMPAIGN_HOOK = (
        "The Obsidian Vault lies beneath the city. Archon Velas, a rogue wizard, "
        "has sealed himself inside and intends to destroy the city's protective "
        "artifacts when the celestial alignment opens the vault in six hours. "
        "Silk, an elven rogue hired by the Mages' Guild, must infiltrate the vault, "
        "neutralize Velas, and secure the artifacts before time runs out."
    )

    SEED = (
        "The Mages' Guild briefing was terse: neutralise Archon Velas before the alignment. "
        "Silk now crouches at a storm drain grate beneath the Merchants' Quarter. "
        "Cold water flows past her boots. Above, the vault clock ticks toward alignment. "
        "The first ward ring begins twenty feet ahead -- a faint violet glow pulses "
        "through the iron grating."
    )

    PARTICIPANTS = [
        {"name": "Dungeon Master", "model": DM_MODEL, "role": "dm"},
        {
            "name": "Silk", 
            "model": NPC_MODEL, 
            "role": "npc",
            "char_class": "Elven Rogue",
            "motivation": "Silk has cracked vaults worse than this. She suspects Velas is her father.",
        },
    ]

    print("Launching session...")
    print(f"  rounds:     {ROUNDS}")
    print(f"  max_tokens: {MAX_TOKENS}")
    print(f"  actors:     2 (DM + Silk)")
    print()

    t_start = time.time()

    # 3. Start Relay
    try:
        resp = api_post("/relay/start", {
            "model_a":            DM_MODEL,
            "model_b":            NPC_MODEL,
            "mode":               "rpg",
            "rounds":             ROUNDS,
            "max_tokens":         MAX_TOKENS,
            "temperature_a":      0.85,
            "temperature_b":      0.85,
            "turn_delay_seconds": TURN_DELAY,
            "seed":               SEED,
            "participants":       PARTICIPANTS,
            "rpg_config":         {
                "tone":          "cinematic",
                "setting":       "fantasy",
                "difficulty":    "normal",
                "campaign_hook": CAMPAIGN_HOOK,
            },
            "enable_scoring":     False,
            "enable_verdict":     False,
        })
    except Exception as e:
        raise SystemExit(f"ERROR starting session: {e}")

    match_id = resp["match_id"]
    print(f"Session started: {match_id}\n")

    # 4. Monitor & Save
    status, rounds_done = wait_for_completion(match_id, t_start)
    elapsed = time.time() - t_start

    print("-" * 60)
    print(f"Status:   {status}")
    print(f"Rounds:   {rounds_done}/{ROUNDS}")
    print(f"Elapsed:  {elapsed:.0f}s ({elapsed / 60:.1f} min)")

    turns = get_turns(match_id)
    if turns:
        valid_lats = [t[3] for t in turns if t[3] is not None]
        avg_lat = sum(valid_lats) / len(valid_lats) if valid_lats else 0
        total_words = sum(len(t[2].split()) for t in turns)
        print(f"Turns:    {len(turns)}")
        print(f"Avg lat:  {avg_lat:.1f}s/turn")
        print(f"Words:    {total_words}")
        print()

        fname = save_log(match_id, DM_MODEL, NPC_MODEL, CAMPAIGN_HOOK, status, rounds_done, turns)
        print(f"Log saved: {fname}")

    if status == "completed":
        print("[OK] Session completed cleanly.")
    else:
        print(f"[WARN] Session ended with status: {status}")


if __name__ == "__main__":
    main()
