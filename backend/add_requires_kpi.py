from database import SessionLocal
from sqlalchemy import text

def fix():
    db = SessionLocal()
    try:
        print("Checking shift_requirements schema...")
        # Check if column exists
        try:
             db.execute(text("SELECT requires_kpi FROM shift_requirements LIMIT 1"))
             print("Column 'requires_kpi' already exists.")
        except Exception:
             print("Column 'requires_kpi' missing. Adding it...")
             db.execute(text("ALTER TABLE shift_requirements ADD COLUMN requires_kpi BOOLEAN DEFAULT 0"))
             print("Added 'requires_kpi' column.")
             
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix()
