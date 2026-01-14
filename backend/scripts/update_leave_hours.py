import sys
import os
from sqlalchemy import text

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal

def update_leave_hours():
    db = SessionLocal()
    try:
        print("Starting bulk update of annual leave hours to 256 using raw SQL...")
        # Use raw SQL to avoid model mismatch issues (e.g. missing hourly_cost column)
        result = db.execute(text("UPDATE employees SET annual_leave_hours = 256"))
        db.commit()
        print(f"Successfully updated employees to 256 annual leave hours. Rows affected: {result.rowcount}")
    except Exception as e:
        print(f"Error updating employees: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_leave_hours()
