
import sqlite3
import sys

DB_PATH = "sl_enterprise.db"

def fix_database():
    print(f"Tentativo di fix completo database: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Recupera colonne esistenti
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Colonne attuali in users: {columns}")
        
        # 1. Fix role_id
        if "role_id" not in columns:
            print("Colonna 'role_id' mancante! Aggiungo...")
            cursor.execute("ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)")
        
        # 2. Fix last_seen
        if "last_seen" not in columns:
            print("Colonna 'last_seen' mancante! Aggiungo...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_seen DATETIME")
            
        # 3. Fix department_id
        if "department_id" not in columns:
            print("Colonna 'department_id' mancante! Aggiungo...")
            cursor.execute("ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id)")

        conn.commit()
        print("Database aggiornato correttamente con TUTTE le colonne mancanti.")
        
    except Exception as e:
        print(f"Errore durante il fix: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    # Eseguiamolo anche per la tabella block_requests nel caso manchi supplier
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("PRAGMA table_info(block_requests)")
        cols = [i[1] for i in c.fetchall()]
        if "supplier_id" not in cols:
             print("Manca supplier_id in block_requests... aggiungo!")
             c.execute("ALTER TABLE block_requests ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)")
             conn.commit()
        conn.close()
    except:
        pass

    fix_database()
