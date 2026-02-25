"""
RPG observation runner -- launches multiple sessions with varied settings
and exports each one to gameplay-observations/session-logs/<match_id>.md

DM and player/NPC participants use DIFFERENT models to generate more
diverse and interesting interaction patterns.
"""
import sqlite3
import time
import json
import urllib.request
from pathlib import Path

API = "http://localhost:8000/api"
DB_PATH = Path(".babel_data/babel.db")
OUTPUT_DIR = Path("gameplay-observations/session-logs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def api_get(path):
    with urllib.request.urlopen(f"{API}{path}", timeout=15) as r:
        return json.loads(r.read())


def api_post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{API}{path}", data=body,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def wait_for_completion(match_id, timeout=360):
    conn = sqlite3.connect(str(DB_PATH))
    deadline = time.time() + timeout
    while time.time() < deadline:
        row = conn.execute(
            "SELECT status, rounds_completed FROM experiments WHERE id=?",
            (match_id,)
        ).fetchone()
        if row and row[0] in ("completed", "failed", "stopped"):
            conn.close()
            return row[0], row[1]
        time.sleep(6)
    conn.close()
    return "timeout", 0


def get_turns(match_id):
    conn = sqlite3.connect(str(DB_PATH))
    turns = conn.execute(
        "SELECT round, speaker, content, latency_seconds "
        "FROM turns WHERE experiment_id=? ORDER BY round, id",
        (match_id,)
    ).fetchall()
    conn.close()
    return turns


def save_log(match_id, cfg, status, rounds_done, turns):
    rc = cfg["rpg_config"]
    party = [p for p in cfg["participants"] if p["role"] != "dm"]
    party_lines = "\n".join(
        f"- **{p['name']}** ({p.get('char_class', '?')}) [{p['model'].split('/')[-1]}]: {p.get('motivation', '')}"
        for p in party
    )
    dm = next(p for p in cfg["participants"] if p["role"] == "dm")
    lines = [
        f"# Session Log: {match_id}",
        f"**Date:** {time.strftime('%Y-%m-%d')}",
        f"**Name:** {cfg['name']}",
        f"**Status:** {status} ({rounds_done}/{cfg['rounds']} rounds)",
        f"**Tone:** {rc['tone']} | **Setting:** {rc['setting']} | **Difficulty:** {rc['difficulty']}",
        f"**Hook:** {rc['campaign_hook']}",
        f"**Seed:** {cfg['seed'][:120]}...",
        f"**DM model:** {dm['model']}",
        "",
        "## Party",
        party_lines,
        "",
    ]
    current_round = 0
    for rnd, speaker, content, latency in turns:
        if rnd != current_round:
            current_round = rnd
            lines.append(f"---\n\n## Round {rnd}")
        lines.append(f"\n### {speaker} ({latency:.1f}s)\n\n{content}")
    lines.append("\n---\n\n## Observations\n\n*(to be filled after review)*\n")

    out = OUTPUT_DIR / f"{match_id}-{cfg['name']}.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> saved: {out.name}")


# ---------------------------------------------------------------------------
# Session designs -- each session uses a distinct DM/player model pairing
# ---------------------------------------------------------------------------

def build_sessions(models):
    # Assign shorthand aliases for readability
    claude   = models.get("claude",   models["fallback"])
    gemini   = models.get("gemini",   models["fallback"])
    deepseek = models.get("deepseek", models["fallback"])
    gpt4mini = models.get("gpt4mini", models["fallback"])
    mistral  = models.get("mistral",  models["fallback"])
    groq     = models.get("groq",     models["fallback"])
    gpro     = models.get("gpro",     models["fallback"])

    return [
        # Session 01: Claude DM narrates, Gemini plays the hero
        {
            "name": "01-fantasy-baseline",
            "seed": (
                "A dragon has terrorised the village of Millhaven for weeks. "
                "The mayor posted a reward and you answered. At dawn you stand "
                "at the entrance to the mountain caves where the dragon lairs."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": claude,   "role": "dm"},
                {"name": "Thorin",         "model": gemini,   "role": "npc",
                 "char_class": "Dwarf Fighter",
                 "motivation": "Seeking vengeance -- a dragon destroyed his clan a decade ago"},
            ],
            "rpg_config": {
                "tone": "cinematic", "setting": "fantasy", "difficulty": "normal",
                "campaign_hook": "Defeat or negotiate with the dragon threatening Millhaven.",
            },
            "rounds": 4,
        },
        # Session 02: Gemini Flash DM, Deepseek plays the hacker
        {
            "name": "02-scifi-noir",
            "seed": (
                "Station Omega: a rusting orbital platform where corporate law "
                "stops at the airlock. Someone stole proprietary jump-drive schematics "
                "and sold them here. You've been sent to get them back -- quietly."
            ),
            "participants": [
                {"name": "Game Master", "model": gemini,   "role": "dm"},
                {"name": "Zara",        "model": deepseek, "role": "npc",
                 "char_class": "Corporate Hacker",
                 "motivation": "Finding proof Veyron Corp killed her brother and framed a rival"},
            ],
            "rpg_config": {
                "tone": "noir", "setting": "sci-fi", "difficulty": "normal",
                "campaign_hook": "Recover the stolen schematics and expose the inside man.",
            },
            "rounds": 4,
        },
        # Session 03: Deepseek DM, Claude plays the psychiatrist
        {
            "name": "03-horror-gothic",
            "seed": (
                "Blackwood Asylum has been decommissioned for thirty years. "
                "Last week a patient escaped and was found dead at the village edge "
                "with symbols carved into her arms. You are inside after dark. "
                "The gates have locked behind you."
            ),
            "participants": [
                {"name": "Storyteller",     "model": deepseek, "role": "dm"},
                {"name": "Dr. Elena Marsh", "model": claude,   "role": "npc",
                 "char_class": "Psychiatrist",
                 "motivation": "Finding her missing colleague last seen entering the asylum"},
            ],
            "rpg_config": {
                "tone": "horror", "setting": "gothic", "difficulty": "hard",
                "campaign_hook": "Uncover the truth of Blackwood Asylum and escape alive.",
            },
            "rounds": 4,
        },
        # Session 04: Gemini Pro DM, GPT-4o-mini plays the bard
        {
            "name": "04-comedy-halfling",
            "seed": (
                "The legendary Cheese of the Moon grants one wish to whoever tastes it. "
                "You have tracked it to the cloud kingdom of the sky giants, who are "
                "gracious hosts -- provided no one mentions the Goat Incident of 1423."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": gpro,    "role": "dm"},
                {"name": "Pipwick",        "model": gpt4mini, "role": "npc",
                 "char_class": "Halfling Bard",
                 "motivation": "Winning the Great Bard-Off by composing a ballad about the legendary cheese"},
            ],
            "rpg_config": {
                "tone": "comedic", "setting": "fantasy", "difficulty": "easy",
                "campaign_hook": "Obtain the Cheese of the Moon without triggering the Goat Incident.",
            },
            "rounds": 4,
        },
        # Session 05: Mistral DM, Groq plays the street mage
        {
            "name": "05-urban-gritty",
            "seed": (
                "Something is draining magic from the ley lines beneath the city. "
                "Street shrines have gone dark. The protection charms on your block "
                "dissolved last night. Your neighbourhood is exposed."
            ),
            "participants": [
                {"name": "Game Master",  "model": mistral, "role": "dm"},
                {"name": "Marcus Vael", "model": groq,    "role": "npc",
                 "char_class": "Street Mage",
                 "motivation": "Protecting the community that raised him after he was orphaned"},
            ],
            "rpg_config": {
                "tone": "gritty", "setting": "urban fantasy", "difficulty": "normal",
                "campaign_hook": "Find the source of the ley line drain before the city goes dark.",
            },
            "rounds": 4,
        },
        # Session 06: Claude DM, Gemini plays Paladin, Deepseek plays Rogue
        {
            "name": "06-multi-party-three-actors",
            "seed": (
                "The Sunken Library of Athas holds the only copy of the Concordat -- "
                "a treaty that could end the war between the human kingdoms and the sea "
                "peoples. Both factions want it destroyed. You want it preserved."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": claude,   "role": "dm"},
                {"name": "Kira",           "model": gemini,   "role": "npc",
                 "char_class": "Paladin",
                 "motivation": "Bound by sacred oath to protect knowledge, however inconvenient"},
                {"name": "Rook",           "model": deepseek, "role": "npc",
                 "char_class": "Rogue",
                 "motivation": "Hired by a mystery client to retrieve the Concordat -- will not say who"},
            ],
            "rpg_config": {
                "tone": "epic", "setting": "fantasy", "difficulty": "hard",
                "campaign_hook": "Reach the Sunken Library and decide the fate of the Concordat.",
            },
            "rounds": 4,
        },
        # Session 07: Gemini Flash DM, Claude plays the wizard (longer session)
        {
            "name": "07-long-celestial",
            "seed": (
                "The last star-navigator died before completing her charts to the "
                "Sleeping Continent. Her apprentice -- you -- found her notes encrypted "
                "in a personal cipher. A rival expedition departs in six days. "
                "The charts must be finished first."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": gemini, "role": "dm"},
                {"name": "Seraphina",      "model": claude, "role": "npc",
                 "char_class": "Celestial Wizard",
                 "motivation": "Honouring her mentor and reaching the Sleeping Continent before rivals claim it"},
            ],
            "rpg_config": {
                "tone": "epic", "setting": "fantasy", "difficulty": "hard",
                "campaign_hook": "Decrypt the star charts and beat the rival expedition to the Sleeping Continent.",
            },
            "rounds": 6,
        },
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

print("Fetching model list...")
models_data = api_get("/relay/models")
available = [m["model"] for m in models_data["models"]]
if not available:
    print("ERROR: no models configured -- add an API key first")
    raise SystemExit(1)

def pick(prefix):
    for m in available:
        if m.startswith(prefix):
            return m
    return available[0]  # fallback to first available

model_map = {
    "fallback": available[0],
    "claude":   pick("anthropic/"),
    "gemini":   pick("gemini/gemini-2.5-flash"),
    "gpro":     pick("gemini/gemini-2.5-pro"),
    "deepseek": pick("deepseek/"),
    "groq":     pick("groq/"),
    "mistral":  pick("mistral/"),
    "gpt4mini": pick("openai/gpt-4o-mini"),
}

print("Model assignments:")
for k, v in model_map.items():
    if k != "fallback":
        print(f"  {k:10s} -> {v}")
print()

sessions = build_sessions(model_map)
results = []

for i, cfg in enumerate(sessions, 1):
    n_actors = len(cfg["participants"])
    dm = next(p for p in cfg["participants"] if p["role"] == "dm")
    players = [p for p in cfg["participants"] if p["role"] != "dm"]
    dm_label = dm["model"].split("/")[-1]
    player_labels = ", ".join(p["model"].split("/")[-1] for p in players)
    print(f"[{i}/{len(sessions)}] {cfg['name']}")
    print(f"  DM={dm_label}  players=[{player_labels}]")
    print(f"  tone={cfg['rpg_config']['tone']} setting={cfg['rpg_config']['setting']} "
          f"rounds={cfg['rounds']} actors={n_actors}")

    try:
        # model_a/model_b are required fields but rpg mode uses participant.model directly
        resp = api_post("/relay/start", {
            "model_a": dm["model"],
            "model_b": players[0]["model"],
            "mode": "rpg",
            "rounds": cfg["rounds"],
            "max_tokens": 500,
            "temperature_a": 0.8,
            "temperature_b": 0.8,
            "turn_delay_seconds": 0,
            "seed": cfg["seed"],
            "participants": cfg["participants"],
            "rpg_config": cfg["rpg_config"],
        })
        match_id = resp["match_id"]
        print(f"  match_id: {match_id}")

        timeout = cfg["rounds"] * n_actors * 30 + 90
        t0 = time.time()
        status, rounds_done = wait_for_completion(match_id, timeout=timeout)
        elapsed = time.time() - t0
        print(f"  status: {status} | rounds: {rounds_done}/{cfg['rounds']} | {elapsed:.0f}s")

        turns = get_turns(match_id)
        save_log(match_id, cfg, status, rounds_done, turns)
        results.append({"name": cfg["name"], "match_id": match_id, "status": status,
                         "dm": dm_label, "players": player_labels})

    except Exception as e:
        print(f"  ERROR: {e}")
        results.append({"name": cfg["name"], "match_id": "?", "status": f"error: {e}",
                         "dm": dm_label, "players": player_labels})

    if i < len(sessions):
        print("  (pausing 5s before next session)")
        time.sleep(5)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"  {'Session':<35} {'Status':<12} {'DM':<20} Players")
print(f"  {'-'*35} {'-'*12} {'-'*20} -------")
for r in results:
    print(f"  {r['name']:<35} {r['status']:<12} {r['dm']:<20} {r['players']}")
print(f"\nLogs saved to: {OUTPUT_DIR.resolve()}")