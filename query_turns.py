import sqlite3

conn = sqlite3.connect('.babel_data/babel.db')

# Find the experiment
exps = conn.execute(
    "SELECT id, model_a, status, rounds_completed FROM experiments WHERE id LIKE ? ORDER BY id DESC LIMIT 3",
    ('811fc66314b8%',)
).fetchall()
print(f"Experiments matching: {exps}")

# Also try recent RPG experiments
recent = conn.execute(
    "SELECT id, model_a, status, rounds_completed, mode FROM experiments WHERE mode='rpg' ORDER BY id DESC LIMIT 5"
).fetchall()
print(f"\nRecent RPG experiments:")
for r in recent:
    print(f"  {r}")

# Get turns for the most recent RPG experiment
if recent:
    exp_id = recent[0][0]
    turns = conn.execute(
        "SELECT round, speaker, content, latency_seconds FROM turns WHERE experiment_id=? ORDER BY round, id",
        (exp_id,)
    ).fetchall()
    print(f"\nTurns for experiment {exp_id} ({len(turns)} total):")
    for rnd, speaker, content, latency in turns:
        print(f"\n--- R{rnd} [{speaker}] ({latency:.1f}s) ---")
        print(content)
