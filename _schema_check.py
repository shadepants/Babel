import sqlite3, json
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("PRAGMA table_info(experiments)")
cols = [r['name'] for r in cur.fetchall()]
print('experiments columns:', cols)
cur.execute("SELECT * FROM experiments ORDER BY created_at DESC LIMIT 3")
rows = cur.fetchall()
for r in rows:
    print(dict(r))
conn.close()