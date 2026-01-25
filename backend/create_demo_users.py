"""
Script per creare utenti demo mancanti (Magazziniere, Sicurezza).
Eseguire: python create_demo_users.py
"""
from database import SessionLocal
from models.core import User, Role
from security import get_password_hash

def create_demo_users():
    db = SessionLocal()
    try:
        # 1. Magazziniere
        role_warehouse = db.query(Role).filter(Role.name == "warehouse_operator").first()
        if role_warehouse:
            user = db.query(User).filter(User.username == "magazziniere").first()
            if not user:
                print("Creating user 'magazziniere'...")
                new_user = User(
                    username="magazziniere",
                    email="magazzino@sle.local",
                    full_name="Mario Magazziniere",
                    password_hash=get_password_hash("password123"),
                    role_id=role_warehouse.id,
                    is_active=True
                )
                db.add(new_user)
                db.commit()
                print("[OK] User 'magazziniere' created.")
            else:
                print("[SKIP] User 'magazziniere' already exists.")
        else:
            print("[ERROR] Role 'warehouse_operator' not found.")

        # 2. Sicurezza
        role_security = db.query(Role).filter(Role.name == "security").first()
        if role_security:
            user = db.query(User).filter(User.username == "sicurezza").first()
            if not user:
                print("Creating user 'sicurezza'...")
                new_user = User(
                    username="sicurezza",
                    email="sicurezza@sle.local",
                    full_name="Addetto Sicurezza",
                    password_hash=get_password_hash("password123"),
                    role_id=role_security.id,
                    is_active=True
                )
                db.add(new_user)
                db.commit()
                print("[OK] User 'sicurezza' created.")
            else:
                print("[SKIP] User 'sicurezza' already exists.")
        else:
            print("[ERROR] Role 'security' not found.")

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_users()
