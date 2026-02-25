import sqlite3
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute('PRAGMA table_info(turns)')
print('turns cols:', [r[1] for r in cur.fetchall()])
cur.execute('SELECT * FROM turns WHERE experiment_id=? ORDER BY created_at DESC LIMIT 3', ('de125ee0facf',))
rows = cur.fetchall()
if rows:
    for r in rows:
        d = dict(r)
        print(d.get('created_at','')[:19], d.get('speaker',''), str(d.get('content',''))[:80])
else:
    print('no turns found')
conn.close()