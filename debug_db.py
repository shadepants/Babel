import sqlite3
import sys

# Write output to file
with open('db_check_output.txt', 'w') as log:
    try:
        log.write("Starting database check...\n")
        log.flush()
        
        conn = sqlite3.connect('.babel_data/babel.db')
        log.write("Connected to database\n")
        log.flush()
        
        cursor = conn.cursor()
        cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
        tables = cursor.fetchall()
        
        log.write(f"Found {len(tables)} tables\n")
        for t in tables:
            log.write(f"  - {t[0]}\n")
        log.flush()
        
        # Get latest experiment
        cursor.execute('SELECT id, match_id FROM experiments ORDER BY created_at DESC LIMIT 1')
        exp = cursor.fetchone()
        if exp:
            log.write(f"\nLatest experiment: {exp[1]} (ID: {exp[0]})\n")
            
            # Check turn_scores
            cursor.execute('SELECT COUNT(*) FROM turn_scores WHERE experiment_id = ?', (exp[0],))
            count = cursor.fetchone()[0]
            log.write(f"Turn scores: {count}\n")
        else:
            log.write("No experiments found\n")
        
        conn.close()
        log.write("Done\n")
    except Exception as e:
        log.write(f"Error: {e}\n")
        import traceback
        traceback.print_exc(file=log)
