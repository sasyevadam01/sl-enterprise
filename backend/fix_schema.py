import sqlite3
import os

DB_PATH = "sl_enterprise.db"

def fix():
    print(f"Checking database at {os.path.abspath(DB_PATH)}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Check users table columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Current columns in users: {columns}")
    
    if "role_id" not in columns:
        print("Missing column 'role_id' in 'users'. Adding...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)")
            conn.commit()
            print("Successfully added 'role_id'.")
        except Exception as e:
            print(f"Error adding role_id: {e}")
    else:
        print("'role_id' column already exists.")

    # 2. Check roles table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'")
    if not cursor.fetchone():
        print("Missing table 'roles'. Creating...")
        try:
            cursor.execute("""
                CREATE TABLE roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    label VARCHAR(100) NOT NULL,
                    description VARCHAR(255),
                    is_static BOOLEAN DEFAULT 0,
                    permissions JSON DEFAULT '[]'
                )
            """)
            cursor.execute("CREATE INDEX ix_roles_id ON roles (id)")
            conn.commit()
            print("Successfully created 'roles' table.")
        except Exception as e:
            print(f"Error creating roles table: {e}")
    else:
        print("'roles' table already exists.")
        
    conn.close()

if __name__ == "__main__":
    fix()
