from sqlalchemy import create_engine, text
from backend.database import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding columns to fleet_checklists...")
        try:
            conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN resolution_notes TEXT"))
            print("- resolution_notes added")
        except Exception as e:
            print(f"- resolution_notes error (maybe exists): {e}")

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
