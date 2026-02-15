import sqlite3
import os

DB_PATH = "sl_enterprise.db"

def add_column_if_not_exists(conn, table, column_def):
    c = conn.cursor()
    col_name = column_def.split()[0]
    try:
        c.execute(f"SELECT {col_name} FROM {table} LIMIT 1")
    except sqlite3.OperationalError:
        print(f"Adding column {col_name} to {table}...")
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
            conn.commit()
            print(f"✅ Added {col_name} to {table}")
        except Exception as e:
            print(f"❌ Failed to add {col_name} to {table}: {e}")
    else:
        print(f"ℹ️ Column {col_name} already exists in {table}.")

def fix_db():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)

    print("--- Checking Missing Columns ---")

    # Users: last_lat FLOAT, last_lon FLOAT, last_location_update DATETIME
    add_column_if_not_exists(conn, "users", "last_lat FLOAT")
    add_column_if_not_exists(conn, "users", "last_lon FLOAT")
    add_column_if_not_exists(conn, "users", "last_location_update DATETIME")

    # Roles: default_home VARCHAR(100)
    add_column_if_not_exists(conn, "roles", "default_home VARCHAR(100)")

    conn.close()
    print("--- Database Check Complete ---")

if __name__ == "__main__":
    fix_db()
