import sqlite3, json
conn = sqlite3.connect(".babel_data/babel.db")
rows = conn.execute("SELECT id, status, created_at FROM experiments ORDER BY created_at DESC LIMIT 5").fetchall()
for r in rows:
    print(r)
conn.close()