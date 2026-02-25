import sqlite3
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("""
    SELECT id, status, rounds_completed, rounds_planned, created_at, mode,
           (SELECT COUNT(*) FROM turns WHERE turns.experiment_id = e.id) turn_count
    FROM experiments e
    WHERE created_at >= '2026-02-25'
    ORDER BY created_at
""")
for r in cur.fetchall():
    eid = r['id'][:12]
    st = r['status']
    rc = r['rounds_completed']
    rp = r['rounds_planned']
    tc = r['turn_count']
    ca = r['created_at'][:19]
    mo = r['mode']
    print(f'{eid}  {st:<10}  {rc}/{rp}  turns={tc:<3}  {ca}  mode={mo}')
conn.close()