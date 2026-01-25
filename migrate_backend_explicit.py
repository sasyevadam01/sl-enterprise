import sqlite3
import os

def migrate_explicit():
    db_path = os.path.join(os.getcwd(), 'backend', 'sl_enterprise.db')
    print(f"Migrating explicitly: {db_path}")
    
    if not os.path.exists(db_path):
        print("ERROR: DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("resolution_notes", "TEXT"),
        ("resolved_at", "DATETIME"),
        ("resolved_by", "INTEGER REFERENCES users(id)")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE fleet_checklists ADD COLUMN {col_name} {col_type}")
            print(f"- Added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print(f"! {col_name} already exists")
            else:
                print(f"X Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Explicit migration finished.")

if __name__ == "__main__":
    migrate_explicit()
