from sqlalchemy import create_engine, text
import sys
import os

# Aggiungi path padre per importare config se servisse, ma qui usiamo raw connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Hardcoded DB URL per sicurezza/semplicità nello script one-off, o prendilo da env
# Assumo connessione standard docker interna o localhost
DATABASE_URL = "mysql+pymysql://root:password@localhost:3306/sl_enterprise"

def migrate():
    print("Inizio migrazione schema Chat Moderazione...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # 1. Controlla se colonna banned_until esiste in conversation_members
        result = conn.execute(text("SHOW COLUMNS FROM conversation_members LIKE 'banned_until'"))
        exists = result.fetchone()
        
        if not exists:
            print("Aggiunta colonna 'banned_until'...")
            conn.execute(text("ALTER TABLE conversation_members ADD COLUMN banned_until DATETIME NULL"))
            print("Colonna aggiunta con successo.")
        else:
            print("Colonna 'banned_until' già presente. Skip.")
            
        conn.commit()
    
    print("Migrazione completata.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Errore durante la migrazione: {e}")
        # Fallback per ambiente docker interno se localhost fallisce (es. se eseguito da dentro container vs fuori)
        print("Tentativo con host 'backend' (se eseguito da altro container)...")
