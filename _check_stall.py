import sqlite3, datetime
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT status, rounds_completed, rounds_planned FROM experiments WHERE id='de125ee0facf'")
exp = dict(cur.fetchone())
print('Experiment:', exp)
cur.execute("SELECT speaker, created_at, content FROM turns WHERE match_id='de125ee0facf' ORDER BY created_at DESC LIMIT 5")
for r in cur.fetchall():
    print(f"  [{r['created_at'][:19]}] {r['speaker']}: {r['content'][:80]}")
conn.close()