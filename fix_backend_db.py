import sqlite3
import os

# Target the active DB in backend/
DB_PATH = os.path.join("backend", "sl_enterprise.db")

def fix_db():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE logistics_requests ADD COLUMN unit_of_measure VARCHAR(20) DEFAULT 'pz'")
        conn.commit()
        print("Colonna 'unit_of_measure' aggiunta con successo!")
    except Exception as e:
        print(f"Errore (probabilmente gia presente): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if os.path.exists(DB_PATH):
        fix_db()
    else:
        print(f"❌ File non trovato: {DB_PATH}")
