import sqlite3, time, datetime

DB = r'C:\Users\User\Repositories\Babel\.babel_data\babel.db'
WATCH = ['de125ee0facf', 'f87055d7cfaf']
INTERVAL = 30
MAX_WAIT = 600

start = time.time()
print(f'[{datetime.datetime.now():%H:%M:%S}] Watching {WATCH}', flush=True)

while time.time() - start < MAX_WAIT:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT id, status, rounds_completed, rounds_planned FROM experiments WHERE id IN (?,?)",
        WATCH
    )
    rows = {r['id']: r for r in cur.fetchall()}
    conn.close()

    all_done = True
    for eid in WATCH:
        r = rows.get(eid)
        if r:
            print(f'  {eid[:12]}  {r["status"]:<10}  {r["rounds_completed"]}/{r["rounds_planned"]}', flush=True)
            if r['status'] not in ('completed', 'failed'):
                all_done = False

    if all_done:
        print(f'[{datetime.datetime.now():%H:%M:%S}] DONE', flush=True)
        break

    time.sleep(INTERVAL)
else:
    print('TIMEOUT', flush=True)