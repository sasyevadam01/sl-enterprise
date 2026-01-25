import sqlite3
import os

DB_PATH = "backend/sl_enterprise.db"

def fix_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Check/Add escalation_level
        try:
            cursor.execute("SELECT escalation_level FROM logistics_requests LIMIT 1")
        except sqlite3.OperationalError:
            print("Adding escalation_level...")
            cursor.execute("ALTER TABLE logistics_requests ADD COLUMN escalation_level INTEGER DEFAULT 0")
            
        # 2. Check/Add cancellation_reason
        try:
            cursor.execute("SELECT cancellation_reason FROM logistics_requests LIMIT 1")
        except sqlite3.OperationalError:
            print("Adding cancellation_reason...")
            cursor.execute("ALTER TABLE logistics_requests ADD COLUMN cancellation_reason TEXT NULL")
            cursor.execute("ALTER TABLE logistics_requests ADD COLUMN cancelled_by_id INTEGER NULL")
            cursor.execute("ALTER TABLE logistics_requests ADD COLUMN cancelled_at DATETIME NULL")

        # 3. Check/Add confirmation_code
        try:
            cursor.execute("SELECT confirmation_code FROM logistics_requests LIMIT 1")
        except sqlite3.OperationalError:
            print("Adding confirmation_code...")
            cursor.execute("ALTER TABLE logistics_requests ADD COLUMN confirmation_code VARCHAR(6) NULL")

        conn.commit()
        print("✅ Database hotfix applied successfully!")
        
    except Exception as e:
        print(f"❌ Error during hotfix: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_db()
