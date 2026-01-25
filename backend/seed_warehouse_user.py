"""
Seed script per creare un utente 'magazziniere' demo.
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from models.core import User, Role
from models.hr import Employee
from security import get_password_hash

def seed_warehouse_user():
    db = SessionLocal()
    try:
        # 1. Assicuriamoci che il ruolo esista
        role = db.query(Role).filter(Role.name == "warehouse_operator").first()
        if not role:
            print("❌ Ruolo 'warehouse_operator' non trovato! Esegui prima init_roles.py")
            return

        # 2. Verifica se esiste già l'utente
        user = db.query(User).filter(User.username == "magazziniere").first()
        if user:
            print("✅ Utente 'magazziniere' già esistente.")
            return

        # 3. Crea dipendente fittizio
        emp = Employee(
            first_name="Mario",
            last_name="Magazziniere",
            fiscal_code="MIOFSC1234567890",
            email="magazzino@slenterprise.com"
        )
        db.add(emp)
        db.flush() # Per avere l'ID
        
        # 4. Crea Utente
        user = User(
            username="magazziniere",
            hashed_password=get_password_hash("password"),
            role_id=role.id,
            employee_id=emp.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        print("✅ Utente 'magazziniere' creato con successo! (Password: password)")

    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_warehouse_user()
