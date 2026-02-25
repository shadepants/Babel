import sqlite3, json
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
# Check all experiments created today, focusing on Groq reruns
cur.execute("""
    SELECT match_id, preset_id, status, 
           created_at, updated_at,
           (SELECT COUNT(*) FROM turns WHERE turns.match_id = experiments.match_id) as turn_count
    FROM experiments 
    WHERE created_at >= '2026-02-25'
    ORDER BY created_at DESC
    LIMIT 20
""")
rows = cur.fetchall()
for r in rows:
    print(f"  {r['match_id'][:12]}  preset={r['preset_id']:<30}  status={r['status']:<10}  turns={r['turn_count']:<4}  created={r['created_at'][:19]}")
conn.close()