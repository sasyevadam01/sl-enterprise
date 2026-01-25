import sys
import os
from sqlalchemy import create_engine, text

# Hardcode the correct path to ensure we hit the real DB
DB_PATH = os.path.join(os.getcwd(), 'backend', 'sl_enterprise.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"

def add_tablet_photo_url_column():
    print(f"Connecting to DB: {DATABASE_URL}")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found at {DB_PATH}")
        return

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN tablet_photo_url VARCHAR(255)"))
            conn.commit()
            print("Successfully added tablet_photo_url column to fleet_checklists")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("Column tablet_photo_url already exists")
            elif "no such table" in str(e).lower():
                print("Table fleet_checklists does not exist!")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_tablet_photo_url_column()
