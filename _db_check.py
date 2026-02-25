import sqlite3
db = r"C:\Users\User\Repositories\Babel\.babel_data\babel.db"
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute("SELECT id, status, rounds_completed, rounds_planned, created_at FROM experiments ORDER BY created_at DESC LIMIT 5")
for r in c.fetchall():
    print(f"{r[0][:12]}  {r[1]:10}  {r[2]}/{r[3]}r  {str(r[4])[:19]}")
conn.close()