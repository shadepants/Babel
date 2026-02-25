"""
Multi-player RPG runner -- sessions where 3-4 different AI models each
play a distinct character, plus a separate DM model.
"""
import sqlite3, time, json, urllib.request
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
    req = urllib.request.Request(f"{API}{path}", data=body,
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def wait_for_completion(match_id, timeout=480):
    conn = sqlite3.connect(str(DB_PATH))
    deadline = time.time() + timeout
    while time.time() < deadline:
        row = conn.execute(
            "SELECT status, rounds_completed FROM experiments WHERE id=?",
            (match_id,)).fetchone()
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
        (match_id,)).fetchall()
    conn.close()
    return turns

def save_log(match_id, cfg, status, rounds_done, turns):
    rc = cfg["rpg_config"]
    party = [p for p in cfg["participants"] if p["role"] != "dm"]
    dm = next(p for p in cfg["participants"] if p["role"] == "dm")
    party_lines = "\n".join(
        f"- **{p['name']}** ({p.get('char_class','?')}) [{p['model'].split('/')[-1]}]: {p.get('motivation','')}"
        for p in party)
    lines = [
        f"# Session Log: {match_id}",
        f"**Date:** {time.strftime('%Y-%m-%d')}",
        f"**Name:** {cfg['name']}",
        f"**Status:** {status} ({rounds_done}/{cfg['rounds']} rounds)",
        f"**Tone:** {rc['tone']} | **Setting:** {rc['setting']} | **Difficulty:** {rc['difficulty']}",
        f"**Hook:** {rc['campaign_hook']}",
        f"**Seed:** {cfg['seed'][:120]}...",
        f"**DM model:** {dm['model']}",
        f"**Player count:** {len(party)} (all different models)",
        "", "## Party", party_lines, "",
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
# Multi-player session designs
# ---------------------------------------------------------------------------

def build_sessions(m):
    claude   = m.get("claude",   m["fallback"])
    gemini   = m.get("gemini",   m["fallback"])
    deepseek = m.get("deepseek", m["fallback"])
    gpt4mini = m.get("gpt4mini", m["fallback"])
    mistral  = m.get("mistral",  m["fallback"])
    groq     = m.get("groq",     m["fallback"])
    gpro     = m.get("gpro",     m["fallback"])

    return [
        # 4 players, 4 different models -- classic dungeon party
        {
            "name": "mp-01-dungeon-four-party",
            "seed": (
                "The Tomb of Araveth lies beneath the Ashwood forest. "
                "Four adventurers who barely know each other accepted the bounty "
                "posted by the Mages Guild: retrieve the Amulet of Unmaking before "
                "the cult of Khar-Zul does. The tomb entrance grinds open at midnight."
            ),
            "participants": [
                {"name": "Dungeon Master", "model": claude,   "role": "dm"},
                {"name": "Aldric",         "model": gemini,   "role": "npc",
                 "char_class": "Human Fighter", "motivation": "Ex-soldier paying off a gambling debt"},
                {"name": "Thessaly",       "model": deepseek, "role": "npc",
                 "char_class": "Half-Elf Mage", "motivation": "Researching the amulet for her thesis -- does not want it destroyed"},
                {"name": "Brix",           "model": groq,     "role": "npc",
                 "char_class": "Goblin Rogue",  "motivation": "Just here for the loot, loyalties entirely negotiable"},
                {"name": "Sister Vael",    "model": gpt4mini, "role": "npc",
                 "char_class": "Dwarf Cleric",  "motivation": "Sealing the tomb permanently -- the amulet must never leave"},
            ],
            "rpg_config": {
                "tone": "cinematic", "setting": "fantasy", "difficulty": "hard",
                "campaign_hook": "Retrieve or destroy the Amulet of Unmaking before the cult claims it.",
            },
            "rounds": 4,
        },
        # 3 players, 3 different models -- starship crew under pressure
        {
            "name": "mp-02-starship-crisis",
            "seed": (
                "The survey vessel Ardent is seven days from the nearest relay beacon "
                "when the distress signal locks on to something in the debris field: "
                "a pre-contact alien structure, intact, broadcasting on a frequency "
                "that matches no known protocol. The captain must decide in six hours "
                "before the orbit decays and the structure is lost forever."
            ),
            "participants": [
                {"name": "Game Master",    "model": gemini,   "role": "dm"},
                {"name": "Commander Rho",  "model": claude,   "role": "npc",
                 "char_class": "Ship Captain",  "motivation": "First contact would make her career -- and her crew are not ready"},
                {"name": "Engineer Soto",  "model": mistral,  "role": "npc",
                 "char_class": "Chief Engineer", "motivation": "Convinced the structure is a weapons platform and refuses to dock"},
                {"name": "Dr. Pell",       "model": deepseek, "role": "npc",
                 "char_class": "Xenobiologist",  "motivation": "Willing to risk everything for the science -- it is why she signed on"},
            ],
            "rpg_config": {
                "tone": "noir", "setting": "sci-fi", "difficulty": "normal",
                "campaign_hook": "Decide whether to board the alien structure before the orbit window closes.",
            },
            "rounds": 4,
        },
        # 3 players, 3 different models -- political intrigue, conflicting agendas
        {
            "name": "mp-03-court-of-shadows",
            "seed": (
                "The High King is dying and has no heir. Three factions have "
                "converged on the capital for the Succession Council: the merchant "
                "guilds, the temple, and the border lords. Each has a candidate. "
                "Tonight, before the vote, someone poisoned the neutral arbiter. "
                "The three envoys are locked in the council chamber together."
            ),
            "participants": [
                {"name": "Storyteller",     "model": gemini,   "role": "dm"},
                {"name": "Ambassador Caine","model": claude,   "role": "npc",
                 "char_class": "Guild Envoy",    "motivation": "Install the merchant candidate -- has blackmail on two councillors"},
                {"name": "High Inquisitor Mira","model": deepseek,"role": "npc",
                 "char_class": "Temple Envoy",   "motivation": "The temple candidate must win -- will admit to anything except the truth"},
                {"name": "Lord Kaspar",     "model": gpt4mini, "role": "npc",
                 "char_class": "Border Lord",    "motivation": "Stall the vote -- his armies need three more days to reach the capital"},
            ],
            "rpg_config": {
                "tone": "gritty", "setting": "fantasy", "difficulty": "hard",
                "campaign_hook": "Survive the night, identify the poisoner, and advance your faction's candidate.",
            },
            "rounds": 4,
        },
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

print("Fetching model list...")
models_data = api_get("/relay/models")
available = [m["model"] for m in models_data["models"]]
if not available:
    print("ERROR: no models configured")
    raise SystemExit(1)

def pick(prefix):
    for m in available:
        if m.startswith(prefix):
            return m
    return available[0]

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
    player_labels = " | ".join(
        f"{p['name']}={p['model'].split('/')[-1]}" for p in players)

    print(f"[{i}/{len(sessions)}] {cfg['name']}")
    print(f"  DM={dm_label}  ({len(players)} players)")
    print(f"  {player_labels}")
    print(f"  tone={cfg['rpg_config']['tone']} rounds={cfg['rounds']}")

    try:
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

        timeout = cfg["rounds"] * n_actors * 35 + 120
        t0 = time.time()
        status, rounds_done = wait_for_completion(match_id, timeout=timeout)
        elapsed = time.time() - t0
        print(f"  status: {status} | rounds: {rounds_done}/{cfg['rounds']} | {elapsed:.0f}s")

        turns = get_turns(match_id)
        save_log(match_id, cfg, status, rounds_done, turns)
        results.append({"name": cfg["name"], "status": status, "match_id": match_id,
                        "dm": dm_label, "players": player_labels})

    except Exception as e:
        print(f"  ERROR: {e}")
        results.append({"name": cfg["name"], "status": f"error: {e}", "match_id": "?",
                        "dm": dm_label, "players": player_labels})

    if i < len(sessions):
        print("  (pausing 8s before next session)")
        time.sleep(8)

print("\n" + "="*70)
print("MULTI-PLAYER SUMMARY")
print("="*70)
for r in results:
    print(f"  {r['name']:<35} {r['status']:<12} DM={r['dm']}")
    print(f"    {r['players']}")
print(f"\nLogs saved to: {OUTPUT_DIR.resolve()}")