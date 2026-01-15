from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def check_active_status():
    print("--- CONTROLLO STATO DIPENDENTI ---")
    
    # Conta Totale
    total = db.execute(text("SELECT COUNT(*) FROM employees")).scalar()
    
    # Conta Attivi
    active = db.execute(text("SELECT COUNT(*) FROM employees WHERE is_active = 1")).scalar()
    
    print(f"Totale Dipendenti: {total}")
    print(f"Dipendenti ATTIVI (is_active=1): {active}")
    print(f"Dipendenti NON ATTIVI: {total - active}")

    if active == 0 and total > 0:
        print("\n⚠️ ATTENZIONE: Tutti i dipendenti sono segnati come NON ATTIVI!")
        print("   Il sito, di default, mostra solo quelli attivi.")
        
    db.close()

if __name__ == "__main__":
    check_active_status()
