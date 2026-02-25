import sqlite3
db = r"C:\Users\User\Repositories\Babel\.babel_data\babel.db"
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row

# Get turn counts for the interesting partial/running sessions
sessions = ["f9afd7bced17","4e66268ccc8b","3f7fbc1606cf","6f050f56576a","da39940975dc","b92562d6f263"]
import sys
for sid in sessions:
    meta = conn.execute("SELECT id, status, rounds_planned, rounds_completed, preset, model_a FROM experiments WHERE id=?", (sid,)).fetchone()
    turns = conn.execute("SELECT COUNT(*) FROM turns WHERE experiment_id=?", (sid,)).fetchone()[0]
    if meta:
        sys.stdout.write(f"{sid}  {meta['status']:10}  turns_in_db={turns}  {meta['rounds_completed']}/{meta['rounds_planned']}r  {(meta['preset'] or meta['model_a'] or '')[:25]}\n")

conn.close()