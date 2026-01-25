from database import SessionLocal, engine
from sqlalchemy import text

def check_columns():
    db = SessionLocal()
    try:
        # Check columns in fleet_checklists
        result = db.execute(text("PRAGMA table_info(fleet_checklists)")).fetchall()
        columns = [row[1] for row in result]
        print("Columns in fleet_checklists:", columns)
        
        required = ['tablet_status', 'tablet_photo_url']
        missing = [col for col in required if col not in columns]
        
        if missing:
            print(f"MISSING COLUMNS: {missing}")
            # Add them
            with engine.connect() as conn:
                for col in missing:
                    print(f"Adding column {col}...")
                    conn.execute(text(f"ALTER TABLE fleet_checklists ADD COLUMN {col} VARCHAR"))
                conn.commit()
            print("Columns added successfully.")
        else:
            print("All columns present.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_columns()
