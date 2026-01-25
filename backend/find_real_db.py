
import sqlite3
import os

PATHS = [
    "sl_enterprise.db",
    "backend/sl_enterprise.db"
]

def check_db(path):
    if not os.path.exists(path):
        print(f"[MISSING] {path} non esiste.")
        return

    size = os.path.getsize(path)
    print(f"\n[{path}] Dimensione: {size} bytes")
    
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM users")
        count = cursor.fetchone()[0]
        print(f" -> Utenti trovati: {count}")
        
        if count > 0:
            cursor.execute("SELECT username FROM users LIMIT 3")
            users = [r[0] for r in cursor.fetchall()]
            print(f" -> Esempi: {users}")
            
        conn.close()
    except Exception as e:
        print(f" -> ERRORE LETTURA: {e}")

if __name__ == "__main__":
    print("Caccia al Database Giusto...")
    for p in PATHS:
        check_db(p)
