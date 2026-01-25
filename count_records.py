import sqlite3
import os

def count_in_db(db_path, name):
    if not os.path.exists(db_path):
        print(f"{name}: File not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM fleet_checklists")
        count = cursor.fetchone()[0]
        print(f"{name} ({db_path}): {count} checklists.")
        
        # Check columns
        cursor.execute("PRAGMA table_info(fleet_checklists)")
        cols = [info[1] for info in cursor.fetchall()]
        print(f"  Columns: {cols}")
        
    except Exception as e:
        print(f"{name}: Error {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    count_in_db("sl_enterprise.db", "ROOT DB")
    count_in_db("backend/sl_enterprise.db", "BACKEND DB")
