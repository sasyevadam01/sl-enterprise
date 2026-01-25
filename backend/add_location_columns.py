import sys
import os
from sqlalchemy import text
from database import engine

def add_location_fields():
    print("Migrazione: Aggiunta campi GPS a tabella users...")
    
    with engine.connect() as conn:
        try:
            # Aggiungi last_lat
            conn.execute(text("ALTER TABLE users ADD COLUMN last_lat FLOAT NULL"))
            print("  + Campo 'last_lat' aggiunto.")
        except Exception as e:
            print(f"  - Campo 'last_lat' già esistente o errore: {e}")

        try:
            # Aggiungi last_lon
            conn.execute(text("ALTER TABLE users ADD COLUMN last_lon FLOAT NULL"))
            print("  + Campo 'last_lon' aggiunto.")
        except Exception as e:
            print(f"  - Campo 'last_lon' già esistente o errore: {e}")

        try:
            # Aggiungi last_location_update
            conn.execute(text("ALTER TABLE users ADD COLUMN last_location_update DATETIME NULL"))
            print("  + Campo 'last_location_update' aggiunto.")
        except Exception as e:
            print(f"  - Campo 'last_location_update' già esistente o errore: {e}")
            
        conn.commit()
    
    print("Migrazione completata!")

if __name__ == "__main__":
    add_location_fields()
