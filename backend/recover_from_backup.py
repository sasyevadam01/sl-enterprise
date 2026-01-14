import sqlite3
import os
import shutil
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 1. SETUP PATHS
# We will look for the specific backup file found in the directory
BACKUP_DIR = "backups"
BACKUP_FILENAME = "sl_enterprise_2026-01-09_21-43.db" 
BACKUP_PATH = os.path.join(BACKUP_DIR, BACKUP_FILENAME)

# Active DB (Assuming Docker environment uses sqlite or mysql, but we use the SQL Alchemy URL)
# For this script to work inside the container effectively, we need to know the target.
# If target is SQLite, we can merge. If target is MariaDB, we iterate and insert.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")

def recover_data():
    if not os.path.exists(BACKUP_PATH):
        print(f"❌ Backup file not found: {BACKUP_PATH}")
        return

    print(f"📂 Connecting to Backup: {BACKUP_PATH}")
    
    # Connect to Backup (Source) - READ ONLY
    try:
        src_conn = sqlite3.connect(BACKUP_PATH)
        src_conn.row_factory = sqlite3.Row
        src_cursor = src_conn.cursor()
    except Exception as e:
        print(f"❌ Failed to open backup DB: {e}")
        return

    # Connect to Active DB (Destination)
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        dest_session = SessionLocal()
        print(f"🔗 Connected to Active DB")
    except Exception as e:
        print(f"❌ Failed to connect to Active DB: {e}")
        return

    # LIST OF TABLES TO RESTORE (Order matters for Foreign Keys!)
    # We purposefully exclude 'alembic_version' to avoid schema conflicts if versions differ significantly,
    # but since it's a reset, we assume schema is compatible.
    tables_to_restore = [
        "configurations", # diverse settings
        "roles", 
        "departments",
        "banchine",
        "machines",
        "users", # needed for created_by
        "employees", # linked to banchine, dept
        "job_roles",
        "certifications", # linked to emp
        "medical_exams",
        "training_records",
        "disciplinary_actions",
        "leave_requests",
        "events",
        "notifications",
        "audit_logs",
        "tasks",
        "task_comments",
        "task_attachments",
        "shift_requirements", # factory
        "shift_assignments",
        "production_entries",
        "machine_downtimes",
        "maintenance_requests",
        "fleet_vehicles",
        "vehicle_movements",
        "returns_management"
    ]

    print("\n🚀 STARTING DEEP RECOVERY...")

    total_imported = 0

    for table in tables_to_restore:
        try:
            # 1. Check if table exists in Source
            src_cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}';")
            if not src_cursor.fetchone():
                print(f"   ⚠️  Skipping {table} (not found in backup)")
                continue

            # 2. Get all data from Source
            src_cursor.execute(f"SELECT * FROM {table}")
            rows = src_cursor.fetchall()
            
            if not rows:
                print(f"   ℹ️  Table {table} is empty.")
                continue

            # 3. Insert into Destination
            # We use raw SQL for speed and to bypass some SQLAlchemy model validation strictness during bulk restore
            print(f"   📥 Restoring {table} ({len(rows)} rows)...")
            
            # Get columns from first row
            columns = rows[0].keys()
            col_names = ", ".join(columns)
            placeholders = ", ".join([":" + col for col in columns])
            
            # Construct Insert Statement (ALLOWS DUPLICATES TO FAIL SILENTLY or REPLACE? Let's use INSERT IGNORE logic equivalent)
            # For SQLite: INSERT OR IGNORE. For MySQL: INSERT IGNORE.
            # We'll try generic INSERT and catch errors per row to be safe.
            
            count_table = 0
            for row in rows:
                data = dict(row)
                
                # Special Fixes for specific tables if schema changed (Optional)
                # if table == 'employees' and 'old_col' in data: ...

                try:
                    # Construct query dynamically based on DB dialect if needed, 
                    # but SQLAlchemy text() handles parameters well.
                    
                    sql = text(f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})")
                    dest_session.execute(sql, data)
                    count_table += 1
                except Exception as e:
                    # Duplicate key error or similar
                    # print(f"      Err: {e}")
                    pass 
            
            dest_session.commit()
            print(f"      ✅ Imported {count_table} / {len(rows)}")
            total_imported += count_table

        except Exception as e:
            print(f"   ❌ CRASH on table {table}: {e}")
            dest_session.rollback()

    src_conn.close()
    dest_session.close()

    print(f"\n🏁 RECOVERY COMPLETE.")
    print(f"📊 Total Rows Restored: {total_imported}")


if __name__ == "__main__":
    recover_data()
