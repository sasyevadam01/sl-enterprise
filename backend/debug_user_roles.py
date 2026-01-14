import sqlite3
import os

DB_PATH = "backend/sl_enterprise.db"

def debug_roles():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- ROLES TABLE ---")
    try:
        cursor.execute("SELECT id, name, label FROM roles")
        roles = cursor.fetchall()
        for r in roles:
            print(f"ID: {r[0]} | Name: {r[1]} | Label: {r[2]}")
    except Exception as e:
        print(f"Error reading roles: {e}")

    print("\n--- USERS (focus on roles) ---")
    try:
        # Check columns
        cursor.execute("PRAGMA table_info(users)")
        columns_info = cursor.fetchall()
        columns = [c[1] for c in columns_info]
        
        query = "SELECT id, username, full_name, role, role_id FROM users"
        cursor.execute(query)
        users = cursor.fetchall()
        
        for u in users:
            print(f"User: {u[1]:<15} | Full Name: {u[2]:<20} | Legacy Role: {u[3]:<15} | Role ID: {u[4]}")
            
    except Exception as e:
        print(f"Error reading users: {e}")
        
    conn.close()

if __name__ == "__main__":
    debug_roles()
