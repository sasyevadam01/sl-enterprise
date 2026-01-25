
import sqlite3

DB_PATH = "sl_enterprise.db"

def inspect_raw():
    print(f"Ispettore Database Raw su: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Conta utenti
        cursor.execute("SELECT count(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"Totale Utenti trovati (Raw SQL): {count}")
        
        if count > 0:
            cursor.execute("SELECT id, username, role, role_id FROM users")
            rows = cursor.fetchall()
            print("\nPrimi 10 utenti:")
            for r in rows[:10]:
                print(f"ID: {r[0]}, User: {r[1]}, Role: {r[2]}, RoleID: {r[3]}")
        else:
            print("Nessun utente trovato! Tabella vuota.")
            
    except Exception as e:
        print(f"Errore SQL: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_raw()
