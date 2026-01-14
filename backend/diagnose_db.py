from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def diagnose():
    print("--- DIAGNOSTICA DATABASE ---")
    
    # 1. Conta Totale
    count = db.execute(text("SELECT COUNT(*) FROM employees")).scalar()
    print(f"Totale Dipendenti: {count}")

    # 2. Cerca Duplicati (Nome + Cognome)
    sql = text("""
        SELECT first_name, last_name, COUNT(*) as c 
        FROM employees 
        GROUP BY first_name, last_name 
        HAVING c > 1
        ORDER BY c DESC
        LIMIT 10
    """)
    duplicates = db.execute(sql).fetchall()
    
    if duplicates:
        print(f"\n⚠️ TROVATI {len(duplicates)} NOMI DUPLICATI (Esempio):")
        for d in duplicates:
            print(f" - {d[0]} {d[1]}: {d[2]} copie")
    else:
        print("\n✅ Nessun duplicato trovato per Nome/Cognome.")

    # 3. Controlla ID alti (creati dopo il restore?)
    print("\n--- ULTIMI 5 DIPENDENTI INSERITI ---")
    last_5 = db.execute(text("SELECT id, first_name, last_name FROM employees ORDER BY id DESC LIMIT 5")).fetchall()
    for l in last_5:
        print(f"ID {l[0]}: {l[1]} {l[2]}")

    db.close()

if __name__ == "__main__":
    diagnose()
