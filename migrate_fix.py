import sys
import os

# Create absolute path to backend and add to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from sqlalchemy import create_engine, text
# Try importing database url directly or define it if import fails due to complex dependencies
try:
    from database import DATABASE_URL
except ImportError:
    DATABASE_URL = "sqlite:///./sql_app.db" # Fallback

def migrate():
    print(f"Migrating using DB URL: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding columns to fleet_checklists...")
        try:
            conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN resolution_notes TEXT"))
            print("- resolution_notes added")
        except Exception as e:
            print(f"- resolution_notes error: {e}")

        try:
            conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN resolved_at DATETIME"))
            print("- resolved_at added")
        except Exception as e:
            print(f"- resolved_at error: {e}")

        try:
            conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN resolved_by INTEGER REFERENCES users(id)"))
            print("- resolved_by added")
        except Exception as e:
            print(f"- resolved_by error: {e}")
            
        conn.commit()
        print("Migration done and committed.")

if __name__ == "__main__":
    migrate()
