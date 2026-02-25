import sqlite3, os, sys
paths = [
    r"C:\Users\User\Repositories\Babel\.babel_data\babel.db",
    r"C:\Users\User\Repositories\Babel\babel.db"
]
for p in paths:
    exists = os.path.exists(p)
    size = os.path.getsize(p) if exists else 0
    sys.stdout.write(f"PATH: {p}  exists={exists}  size={size}\n")
    sys.stdout.flush()
    if exists and size > 0:
        conn = sqlite3.connect(p)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("SELECT id, model_a, status, rounds_planned, rounds_completed, created_at, preset FROM experiments ORDER BY created_at DESC LIMIT 40").fetchall()
            sys.stdout.write(f"  rows={len(rows)}\n")
            for r in rows:
                sys.stdout.write(f"  {r['id']}  {r['status']:10}  {r['rounds_completed']}/{r['rounds_planned']}r  {(r['preset'] or r['model_a'] or '')[:22]}  {str(r['created_at'])[:16]}\n")
        except Exception as e:
            sys.stdout.write(f"  ERROR: {e}\n")
        sys.stdout.flush()
        conn.close()