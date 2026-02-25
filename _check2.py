import sqlite3
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT status, rounds_completed, rounds_planned FROM experiments WHERE id='de125ee0facf'")
exp = dict(cur.fetchone())
print('status:', exp['status'], '  rounds:', exp['rounds_completed'], '/', exp['rounds_planned'])
cur.execute("SELECT speaker, created_at, content FROM turns WHERE match_id='de125ee0facf' ORDER BY created_at DESC LIMIT 3")
for r in cur.fetchall():
    print(r['created_at'][:19], r['speaker'], r['content'][:80])
conn.close()