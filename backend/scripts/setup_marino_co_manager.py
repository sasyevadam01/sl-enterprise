from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Employee
import os
import sys

# Add parent directory to path to import database/models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal

def fix_marino():
    db = SessionLocal()
    try:
        # 1. Find Marino and Piccirillo
        marino = db.query(Employee).filter(Employee.last_name.ilike('%Marino%')).first()
        piccirillo = db.query(Employee).filter(Employee.last_name.ilike('%Piccirillo%')).first()

        if not marino:
            print("❌ Errore: Utente 'Marino' non trovato nel database.")
            return
        if not piccirillo:
            print("❌ Errore: Utente 'Piccirillo' non trovato nel database.")
            return

        print(f"✅ Trovato Marino: {marino.first_name} {marino.last_name} (ID: {marino.id})")
        print(f"✅ Trovato Piccirillo: {piccirillo.first_name} {piccirillo.last_name} (ID: {piccirillo.id})")

        # 2. Find Piccirillo's team
        team = db.query(Employee).filter(Employee.manager_id == piccirillo.id).all()
        print(f"📊 Team Piccirillo: {len(team)} dipendenti trovati.")

        # 3. Assign Marino as Co-Manager
        updated_count = 0
        for emp in team:
            if emp.co_manager_id != marino.id:
                old_co = emp.co_manager_id
                emp.co_manager_id = marino.id
                print(f"  ➜ Aggiorno {emp.first_name} {emp.last_name}: Co-Manager {old_co} -> {marino.id}")
                updated_count += 1
            else:
                print(f"  = {emp.first_name} {emp.last_name} ha già Marino come co-manager.")

        if updated_count > 0:
            db.commit()
            print(f"\n🚀 Successo! Aggiornati {updated_count} dipendenti.")
            print("Ora Marino vedrà il team di Piccirillo e potrà filtrarlo dal menu a tendina.")
        else:
            print("\n👌 Nessun aggiornamento necessario. Marino è già co-manager di tutti.")

    except Exception as e:
        print(f"❌ Errore imprevisto: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_marino()
