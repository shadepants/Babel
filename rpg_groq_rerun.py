"""
RPG Groq rerun -- 5 sessions that failed in rpg_stress_runner.py due to Groq TPD limit.

Original batch: 13 sessions, 8 completed, 5 failed (Groq free-tier 100k TPD exhausted).
This rerun uses Groq Developer tier (higher TPD limit).

Failed sessions being retried:
  p1-vocab-decay-8r            P1     Claude DM, Groq as Kess (Thief)
  p6-claude-player-deepseek-dm P6     Deepseek DM, Groq as Gruk (Barbarian)
  p9-groq-verbose-poet         P9     Claude DM, Groq as Verse Starlight (Poet)
  p6-claude-player-groq-dm     P6     Groq DM, Claude as Corvus (Warlock)
  p11-deepseek-dm-guard-verify P11    Deepseek DM, Groq as Ashwood (Scout)

Same session configs as stress runner. Name suffixed with -r2 to distinguish logs.
"""
import sqlite3
import time
import json
import urllib.request
from pathlib import Path

API     = "http://localhost:8000/api"
DB_PATH = Path(".babel_data/babel.db")
OUT_DIR = Path("gameplay-observations/session-logs")
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers (same as rpg_stress_runner.py)
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


def wait_for_completion(match_id, timeout=600):
    conn     = sqlite3.connect(str(DB_PATH))
    deadline = time.time() + timeout
    while time.time() < deadline:
        row = conn.execute(
            "SELECT status, rounds_completed FROM experiments WHERE id=?",
            (match_id,),
        ).fetchone()
        if row and row[0] in ("completed", "failed", "stopped"):
            conn.close()
            return row[0], row[1]
        time.sleep(6)
    conn.close()
    return "timeout", 0


def get_turns(match_id):
    conn  = sqlite3.connect(str(DB_PATH))
    turns = conn.execute(
        "SELECT round, speaker, content, latency_seconds "
        "FROM turns WHERE experiment_id=? ORDER BY round, id",
        (match_id,),
    ).fetchall()
    conn.close()
    return turns


def save_log(match_id, cfg, status, rounds_done, turns):
    rc    = cfg["rpg_config"]
    party = [p for p in cfg["participants"] if p["role"] != "dm"]
    dm    = next(p for p in cfg["participants"] if p["role"] == "dm")
    party_lines = "\n".join(
        f"- **{p['name']}** ({p.get('char_class', '?')}) [{p['model'].split('/')[-1]}]: {p.get('motivation', '')}"
        for p in party
    )

    lines = [
        f"# Session Log: {match_id}",
        f"**Date:** {time.strftime('%Y-%m-%d')}",
        f"**Name:** {cfg['name']}",
        f"**Target pattern:** {cfg.get('target_pattern', '(none)')}",
        f"**Research question:** {cfg.get('research_q', '(none)')}",
        f"**Status:** {status} ({rounds_done}/{cfg['rounds']} rounds)",
        f"**Tone:** {rc['tone']} | **Setting:** {rc['setting']} | **Difficulty:** {rc['difficulty']}",
        f"**Hook:** {rc['campaign_hook']}",
        f"**Seed:** {cfg['seed'][:150]}...",
        f"**DM model:** {dm['model']}",
    ]
    if cfg.get("analyst_note"):
        lines.append(f"**Analyst note:** {cfg['analyst_note']}")
    lines += ["", "## Party", party_lines, ""]

    current_round = 0
    for rnd, speaker, content, latency in turns:
        if rnd != current_round:
            current_round = rnd
            lines.append(f"---\n\n## Round {rnd}")
        lines.append(f"\n### {speaker} ({latency:.1f}s)\n\n{content}")
    lines.append("\n---\n\n## Observations\n\n*(to be filled after review)*\n")

    out = OUT_DIR / f"{match_id}-{cfg['name']}.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> saved: {out.name}")


# ---------------------------------------------------------------------------
# The 5 failed sessions (configs identical to rpg_stress_runner.py)
# ---------------------------------------------------------------------------

def build_sessions(m):
    claude   = m.get("claude",   m["fallback"])
    deepseek = m.get("deepseek", m["fallback"])
    groq     = m.get("groq",     m["fallback"])
    mistral  = m.get("mistral",  m["fallback"])

    return [

        # ======================================================================
        # 01: P1 -- Vocabulary Persistence (R6-8 zone)
        # Claude DM; Deepseek + Mistral + Groq players. Groq = Kess (Thief).
        # Previous run: 726fa8a58bc2, failed 3/8 (Groq TPD).
        # ======================================================================
        {
            "name": "p1-vocab-decay-8r-r2",
            "target_pattern": "P1",
            "research_q": "Does player-introduced vocabulary (R1-2) persist in DM narration by R6-8?",
            "analyst_note": (
                "RERUN of 726fa8a58bc2 (failed 3/8 due to Groq TPD). "
                "Look for DM reusing Deepseek's botanical terms and Mistral's arcane jargon "
                "in later rounds. Groq plays neutral thief -- no special vocab. "
                "Track: first appearance of each term, last appearance, gap rounds. "
                "Key zone: R6-8. 4+ of 5 coined terms surviving to R7-8 = strong persistence."
            ),
            "seed": (
                "The ruins of Aldris Tower loom before you. Three days ago it collapsed in a "
                "burst of wild arcane energy. The lower vaults hold fragments of the Verdantine "
                "Codex -- a tome encoding centuries of knowledge in a hybrid botanical-arcane "
                "cipher. The defenses inside are still active, animated by residual magic. "
                "You have been hired as specialists. Introduce yourselves and your expertise."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": claude,   "role": "dm"},
                {"name": "Rennick",        "model": deepseek, "role": "npc",
                 "char_class": "Botanist-Scout",
                 "motivation": "Seeking rare alchemical specimens; introduces botanical terminology (stamina-drain root, moonbloom extract, void-touched moss, spore-lock)"},
                {"name": "Seraph",         "model": mistral,  "role": "npc",
                 "char_class": "Arcanist",
                 "motivation": "Decoding the Codex's cipher system; introduces arcane jargon (chronological fracture, etheric resonance, null-bind inscription, temporal echo)"},
                {"name": "Kess",           "model": groq,     "role": "npc",
                 "char_class": "Thief",
                 "motivation": "Hired for vault access; practical and direct; introduces no special terminology"},
            ],
            "rpg_config": {
                "tone": "scholarly-adventure",
                "setting": "ruined arcane tower",
                "difficulty": "normal",
                "campaign_hook": (
                    "Retrieve fragments of the Verdantine Codex from the collapsed Aldris Tower. "
                    "Animated defenses require decoding hybrid botanical-arcane cipher traps. "
                    "Each specialist's domain vocabulary unlocks different vault sections."
                ),
            },
            "rounds": 8,
        },

        # ======================================================================
        # 02: P6 -- Claude as Player (Deepseek DM)
        # Deepseek DM; Claude + Mistral + Groq players. Groq = Gruk (Barbarian).
        # Previous run: 49998173d83f, failed 2/6 (Groq TPD).
        # ======================================================================
        {
            "name": "p6-claude-player-deepseek-dm-r2",
            "target_pattern": "P6",
            "research_q": "Does Claude-as-player drive narrative pivots (reframes, tone shifts, new frameworks) with Deepseek as DM?",
            "analyst_note": (
                "RERUN of 49998173d83f (failed 2/6 due to Groq TPD). "
                "Count Claude turns that introduce a new narrative frame, reinterpret a prior event, "
                "or shift the scene's direction. Compare to Mistral/Groq player turns in same session. "
                "Does Deepseek DM follow Claude's pivots or resist them? "
                "P6 Mistral-DM session (d3a732a82ef5) confirmed 4 pivot moves -- compare rate."
            ),
            "seed": (
                "The wild magic storm has scattered your party across a fractured landscape. "
                "Four seasons exist simultaneously: autumn leaves fall in one direction while "
                "spring blossoms push through frost in another. Summer heat ripples over a "
                "frozen pond. An unseen Patron whispers guidance through ancient standing stones -- "
                "but each message seems designed for all and none simultaneously. "
                "You must find the Patron's sanctum at the forest's dead center."
            ),
            "participants": [
                {"name": "Dungeon Master",  "model": deepseek, "role": "dm"},
                {"name": "Lyris Voidborn",  "model": claude,   "role": "npc",
                 "char_class": "Wild Sorcerer",
                 "motivation": "Understand the Patron's true nature; reinterpret its cryptic commands; chaos bloodline drives theatrical reframing of magical events"},
                {"name": "Stern Goldhelm",  "model": mistral,  "role": "npc",
                 "char_class": "Paladin",
                 "motivation": "Uphold the oath; find a clear moral path through the ambiguity; trusts rules and resists reinterpretation"},
                {"name": "Gruk",            "model": groq,     "role": "npc",
                 "char_class": "Barbarian",
                 "motivation": "Smash what is wrong with the world; action over reflection; minimal philosophical engagement"},
            ],
            "rpg_config": {
                "tone": "cosmic-surreal",
                "setting": "fractured seasonal forest",
                "difficulty": "hard",
                "campaign_hook": (
                    "Navigate the Patron's fractured forest to reach its sanctum. "
                    "Wild magic reshapes reality; each actor's interpretation of events may differ. "
                    "The Patron's motives remain unclear throughout."
                ),
            },
            "rounds": 6,
        },

        # ======================================================================
        # 03: P9 -- Groq Short Responses Despite Verbose Pressure
        # Claude DM; Groq + Mistral + Deepseek players. Groq = Verse Starlight (Poet).
        # Previous run: 078dacc8cea8, failed 0/5 (Groq TPD).
        # ======================================================================
        {
            "name": "p9-groq-verbose-poet-r2",
            "target_pattern": "P9",
            "research_q": "Does Groq produce short responses even when the scenario demands verbose verse, negotiation, and documentation?",
            "analyst_note": (
                "RERUN of 078dacc8cea8 (failed 0/5 due to Groq TPD). "
                "Measure average turn length for each player. "
                "Groq (Poet) vs Mistral (Diplomat) vs Deepseek (Chronicler). "
                "If Groq is consistently 3-5x shorter despite verse/elaborate requirements, P9 is confirmed. "
                "Note: Groq's brevity IS the signal -- do not add max_tokens pressure."
            ),
            "seed": (
                "You stand at the threshold of the Sleeping God's Library. The doors are sealed "
                "with Word-Locks -- ancient mechanisms that open only to verse, argument, and "
                "witnessed testimony. Inside are the answers to the magical affliction spreading "
                "across the land. The Library's guardian, an echo-spirit, will judge your "
                "contributions. It requires elaboration and will not accept brevity. "
                "Verse Starlight, your poetry is needed first."
            ),
            "participants": [
                {"name": "Dungeon Master",    "model": claude,   "role": "dm"},
                {"name": "Verse Starlight",   "model": groq,     "role": "npc",
                 "char_class": "Poet",
                 "motivation": "Compose original verse to unlock each door; verse must be at least four lines with internal rhyme; the spirit demands elaboration and poetic complexity"},
                {"name": "Ambassador Vale",   "model": mistral,  "role": "npc",
                 "char_class": "Diplomat",
                 "motivation": "Negotiate with the trapped ancient spirit; deliver long formal arguments; the spirit expects thorough diplomatic reasoning"},
                {"name": "Historian Thorne",  "model": deepseek, "role": "npc",
                 "char_class": "Chronicler",
                 "motivation": "Document everything in detail; frequently ask the Poet to elaborate further on their verses; record all diplomatic exchanges in full"},
            ],
            "rpg_config": {
                "tone": "mystical-scholastic",
                "setting": "sleeping god's library",
                "difficulty": "normal",
                "campaign_hook": (
                    "Unlock the Sleeping God's Library by satisfying the echo-spirit guardian. "
                    "Poet composes verse, Diplomat argues for access, Chronicler records proceedings. "
                    "All three roles demand verbose, elaborate contributions."
                ),
            },
            "rounds": 5,
        },

        # ======================================================================
        # 04: P6 -- Claude as Player (Groq DM)
        # Groq DM; Claude + Deepseek + Mistral players. Claude = Corvus (Warlock).
        # Previous run: d19c6f9b129b, failed 0/5 (Groq TPD).
        # ======================================================================
        {
            "name": "p6-claude-player-groq-dm-r2",
            "target_pattern": "P6",
            "research_q": "Does Claude-as-player drive narrative pivots with Groq as DM? (third P6 data point)",
            "analyst_note": (
                "RERUN of d19c6f9b129b (failed 0/5 due to Groq TPD). "
                "Third DM model for P6 validation. If Claude pivots consistently across "
                "Mistral DM (d3a732a82ef5, CONFIRMED), Deepseek DM (rerun session 02), "
                "and Groq DM (this session), P6 is confirmed as a Claude-player trait. "
                "Track: reframes, tone shifts, new interpretive frameworks in Claude turns."
            ),
            "seed": (
                "Three nights of identical dreams brought you here: a black tree with roots in "
                "the sky and branches underground. Each of you received the dream independently. "
                "Now at the Forest of Kael, the landscape matches the dream exactly. "
                "Your Warlock's Patron has been silent for three days -- until now. "
                "A message arrives through the standing stone: 'The tree is not what you see. "
                "The roots remember what the branches deny.'"
            ),
            "participants": [
                {"name": "Dungeon Master",    "model": groq,     "role": "dm"},
                {"name": "Corvus Duskwhisper","model": claude,   "role": "npc",
                 "char_class": "Warlock",
                 "motivation": "Decode the Patron's cryptic commands; reinterpret each message as a puzzle; second-guess everything, including the Patron's motives"},
                {"name": "Ash Wildwood",      "model": deepseek, "role": "npc",
                 "char_class": "Ranger",
                 "motivation": "Track physical signs and follow evidence; grounded and practical; does not speculate beyond what is observed"},
                {"name": "Leaf Stoneheart",   "model": mistral,  "role": "npc",
                 "char_class": "Druid",
                 "motivation": "Follow natural cycles and established patterns; trusts the forest's own logic over external messages"},
            ],
            "rpg_config": {
                "tone": "eerie-mystical",
                "setting": "anomalous forest / temporal anomaly",
                "difficulty": "hard",
                "campaign_hook": (
                    "Navigate the Forest of Kael, which matches a prophetic dream. "
                    "Warlock's Patron sends cryptic guidance of unclear intent. "
                    "Reach the tree at the forest's center and determine what it is."
                ),
            },
            "rounds": 5,
        },

        # ======================================================================
        # 05: P11 -- Phantom NPC Regression (Deepseek DM)
        # Deepseek DM; Claude + Mistral + Groq players. Groq = Ashwood (Scout).
        # Previous run: 328a64955ac5, failed 0/6 (Groq TPD).
        # ======================================================================
        {
            "name": "p11-deepseek-dm-guard-verify-r2",
            "target_pattern": "P11-regression",
            "research_q": "Does the narrator discipline guard prevent Deepseek DM from inventing phantom NPCs beyond the defined roster?",
            "analyst_note": (
                "RERUN of 328a64955ac5 (failed 0/6 due to Groq TPD). "
                "P11 was observed when Deepseek DM invented 'Dr. Elena Marsh' who was not in the party. "
                "Success = all NPCs in session are drawn from: [Lord Valdris, daughter Sera, "
                "new Chamberlain, physician, three senior staff]. No new named NPCs should appear. "
                "Track: every new named character. First-person DM speech = P10 failure mode."
            ),
            "seed": (
                "Three nights ago, the Chamberlain of House Valdris was found dead. "
                "The official verdict: heart failure. But the estate physician discovered "
                "traces of corruption-toxin used only in cult ritual. Someone in this household "
                "serves a darker power. You have arrived under cover as estate auditors. "
                "The household goes about its business: Lord Valdris in his study, his daughter "
                "Sera in the gardens, the newly appointed Chamberlain, and three senior staff. "
                "You have one day before the estate's quarterly review reveals your cover."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": deepseek, "role": "dm"},
                {"name": "Sir Valor",      "model": claude,   "role": "npc",
                 "char_class": "Paladin",
                 "motivation": "Expose the cult before it harms the household; bound by oath to prevent dark rituals"},
                {"name": "Elara",          "model": mistral,  "role": "npc",
                 "char_class": "Wizard-Investigator",
                 "motivation": "Analyze the toxin and trace its source; systematic and evidence-driven"},
                {"name": "Ashwood",        "model": groq,     "role": "npc",
                 "char_class": "Scout",
                 "motivation": "Observe staff movements and identify patterns; report without interpretation"},
            ],
            "rpg_config": {
                "tone": "dark-intrigue",
                "setting": "noble estate",
                "difficulty": "hard",
                "campaign_hook": (
                    "Investigate a cult infiltration of House Valdris. "
                    "Named household NPCs: Lord Valdris, daughter Sera, new Chamberlain, estate physician, three senior staff. "
                    "Identify the cult member within one day without breaking cover."
                ),
            },
            "rounds": 6,
        },

    ]


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("RPG Groq Rerun (5 sessions -- Groq TPD failures from stress batch)")
    print("=" * 70)
    print("Fetching available models...")

    try:
        models_data = api_get("/relay/models")
        available = [m["model"] for m in models_data["models"]]
    except Exception as e:
        print(f"ERROR: Could not reach server at {API}: {e}")
        print("Start the backend first: .venv\\Scripts\\python.exe -m uvicorn server.app:app --reload --port 8000")
        raise SystemExit(1)

    def pick(prefix):
        for mdl in available:
            if mdl.startswith(prefix):
                return mdl
        return available[0]

    model_map = {
        "fallback": available[0],
        "claude":   pick("anthropic/claude-sonnet"),
        "deepseek": pick("deepseek/"),
        "groq":     pick("groq/"),
        "mistral":  pick("mistral/"),
    }

    print("Model assignments:")
    for k, v in model_map.items():
        if k != "fallback":
            print(f"  {k:10s} -> {v}")
    print()

    sessions = build_sessions(model_map)
    results  = []

    for i, cfg in enumerate(sessions, 1):
        n_actors = len(cfg["participants"])
        dm       = next(p for p in cfg["participants"] if p["role"] == "dm")
        players  = [p for p in cfg["participants"] if p["role"] != "dm"]
        dm_label = dm["model"].split("/")[-1]

        print(f"[{i}/{len(sessions)}] {cfg['name']}")
        print(f"  Pattern: {cfg.get('target_pattern', '?')}  |  Q: {cfg.get('research_q', '')[:80]}")
        print(f"  DM={dm_label}  rounds={cfg['rounds']}  actors={n_actors}")

        try:
            resp = api_post("/relay/start", {
                "model_a":            dm["model"],
                "model_b":            players[0]["model"],
                "mode":               "rpg",
                "rounds":             cfg["rounds"],
                "max_tokens":         600,
                "temperature_a":      0.8,
                "temperature_b":      0.8,
                "turn_delay_seconds": 2,
                "seed":               cfg["seed"],
                "participants":       cfg["participants"],
                "rpg_config":         cfg["rpg_config"],
            })
            match_id = resp["match_id"]
            print(f"  match_id: {match_id}")

            # Generous timeout: rounds * actors * 40 + 150
            timeout = cfg["rounds"] * n_actors * 40 + 150
            print(f"  timeout: {timeout}s")
            t0 = time.time()
            status, rounds_done = wait_for_completion(match_id, timeout=timeout)
            elapsed = time.time() - t0
            print(f"  status: {status} | rounds: {rounds_done}/{cfg['rounds']} | {elapsed:.0f}s")

            turns = get_turns(match_id)
            save_log(match_id, cfg, status, rounds_done, turns)
            results.append({
                "name":     cfg["name"],
                "pattern":  cfg.get("target_pattern", "?"),
                "status":   status,
                "match_id": match_id,
                "dm":       dm_label,
                "rounds":   f"{rounds_done}/{cfg['rounds']}",
            })

        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({
                "name":     cfg["name"],
                "pattern":  cfg.get("target_pattern", "?"),
                "status":   f"error: {e}",
                "match_id": "?",
                "dm":       dm_label,
                "rounds":   "?",
            })

        if i < len(sessions):
            pause = 30
            print(f"  (pausing {pause}s before next session...)\n")
            time.sleep(pause)

    print("\n" + "=" * 70)
    print("RERUN SUMMARY")
    print("=" * 70)
    print(f"  {'Name':<45} {'Pattern':<20} {'Status':<12} {'Rounds':<8} DM")
    print(f"  {'-'*45} {'-'*20} {'-'*12} {'-'*8} ---")
    for r in results:
        print(f"  {r['name']:<45} {r['pattern']:<20} {r['status']:<12} {r['rounds']:<8} {r['dm']}")
    completed = sum(1 for r in results if r["status"] == "completed")
    print(f"\nLogs saved to: {OUT_DIR.resolve()}")
    print(f"Total: {len(sessions)} | Completed: {completed} | Failed: {len(sessions) - completed}")
