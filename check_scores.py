import sqlite3
import sys

try:
    # Connect to the database
    conn = sqlite3.connect('.babel_data/babel.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get the latest experiment
    cursor.execute('SELECT id, match_id, judge_model FROM experiments ORDER BY created_at DESC LIMIT 1')
    exp = cursor.fetchone()
    if exp:
        exp_id = exp['id']
        match_id = exp['match_id']
        print(f"Latest experiment: {match_id}")
        print(f"Judge model: {exp['judge_model']}")
        print(f"Experiment ID: {exp_id}")
        
        # Check turn scores
        cursor.execute('SELECT COUNT(*) as cnt FROM turn_scores WHERE experiment_id = ?', (exp_id,))
        result = cursor.fetchone()
        count = result['cnt'] if result else 0
        print(f"Turn scores in DB: {count}")
        
        if count > 0:
            cursor.execute('SELECT turn_number, creativity, coherence, engagement, novelty FROM turn_scores WHERE experiment_id = ? ORDER BY turn_number', (exp_id,))
            for row in cursor.fetchall():
                c = row['creativity']
                co = row['coherence']
                e = row['engagement']
                n = row['novelty']
                print(f"  Turn {row['turn_number']}: C={c:.2f} Co={co:.2f} E={e:.2f} N={n:.2f}")
        else:
            print("  (No scores recorded)")
    else:
        print("No experiments found in database")
    
    conn.close()
except Exception as ex:
    print(f"Error: {ex}", file=sys.stderr)
    import traceback
    traceback.print_exc()
