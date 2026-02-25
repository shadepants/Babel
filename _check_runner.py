import sqlite3
conn = sqlite3.connect(r'C:\Users\User\Repositories\Babel\.babel_data\babel.db')
# Check turns for stuck sessions
for mid in ('35f7bc57a16d', '17ea1966f4cb'):
    turns = conn.execute('SELECT round, speaker, content[:80] FROM turns WHERE experiment_id=?', (mid,)).fetchall()
    print(f'{mid}: {len(turns)} turns')
    for t in turns:
        print(f'  r{t[0]} {t[1]}: {t[2]}')
# Also check experiment details
rows = conn.execute('SELECT id, mode, status, rounds_completed, created_at FROM experiments ORDER BY created_at DESC LIMIT 10').fetchall()
for r in rows:
    print(r)
conn.close()