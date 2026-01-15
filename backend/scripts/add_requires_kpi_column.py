
import sqlite3
import os

DB_PATH = "sl_enterprise.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--> Checking 'requires_kpi' column in 'shift_requirements'...")
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(shift_requirements)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "requires_kpi" not in columns:
            print("   Column not found. Adding it...")
            cursor.execute("ALTER TABLE shift_requirements ADD COLUMN requires_kpi BOOLEAN DEFAULT 0")
            print("   Column added.")
        else:
            print("   Column already exists.")
            
        # Update existing records
        print("--> Updating existing records flags...")
        # Se ha un kpi_sector, allora requires_kpi = 1
        cursor.execute("UPDATE shift_requirements SET requires_kpi = 1 WHERE kpi_sector IS NOT NULL AND kpi_sector != ''")
        updated_rows = cursor.rowcount
        print(f"   Updated {updated_rows} rows to requires_kpi=1 based on existing kpi_sector.")
        
        conn.commit()
    except Exception as e:
        print(f"ERROR: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
