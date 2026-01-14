"""
Script per collegare gli utenti esistenti ai loro record dipendente
"""
from database import SessionLocal, User, Employee

def link_users_to_employees():
    db = SessionLocal()
    try:
        print("--- LINK USERS TO EMPLOYEES ---")
        
        # Link Salvatore Laezza
        slaezza = db.query(User).filter(User.username == "slaezza").first()
        if slaezza:
            emp_salvatore = db.query(Employee).filter(
                Employee.first_name.ilike("%Salvatore%"),
                Employee.last_name.ilike("%Laezza%")
            ).first()
            if emp_salvatore:
                emp_salvatore.user_id = slaezza.id
                print(f"Linked: slaezza -> {emp_salvatore.first_name} {emp_salvatore.last_name} (ID: {emp_salvatore.id})")
            else:
                print("Employee 'Salvatore Laezza' not found!")
        
        # Link Antonio Esposito
        aesposito = db.query(User).filter(User.username == "aesposito").first()
        if aesposito:
            # Cerca Antonio Esposito (potrebbe esserci omonimia, cerca il manager/controller)
            emp_antonio = db.query(Employee).filter(
                Employee.first_name.ilike("%Antonio%"),
                Employee.last_name.ilike("%Esposito%")
            ).first()
            if emp_antonio:
                emp_antonio.user_id = aesposito.id
                print(f"Linked: aesposito -> {emp_antonio.first_name} {emp_antonio.last_name} (ID: {emp_antonio.id})")
            else:
                print("Employee 'Antonio Esposito' not found!")
        
        db.commit()
        print("--- LINK COMPLETED ---")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    link_users_to_employees()
