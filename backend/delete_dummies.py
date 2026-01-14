from database import SessionLocal, Employee, User
import sys

def delete_dummies():
    db = SessionLocal()
    try:
        dummies = [
            ("User", "Test"),
            ("Verdi", "Luigi"),
            ("Rossi", "Mario"),
            ("Testi", "Marco")
        ]

        print("Searching for dummy users to delete...")
        
        for last, first in dummies:
            # Try to match both ways in case of confusion, or just match specifically
            # User request: "User Test ; Verdi Luigi ; Rossi Mario ; Testi Marco"
            # Assumptions: First string is Surname, second is Name? Or Name Surname?
            # "User Test" -> likely Name="User" Surname="Test" OR Name="Test" Surname="User"
            # "Verdi Luigi" -> Surname="Verdi" Name="Luigi"
            # "Rossi Mario" -> Surname="Rossi" Name="Mario"
            # "Testi Marco" -> Surname="Testi" Name="Marco"
            
            # Let's search broadly
            emps = db.query(Employee).filter(
                ((Employee.last_name == last) & (Employee.first_name == first)) |
                ((Employee.last_name == first) & (Employee.first_name == last))
            ).all()

            for emp in emps:
                print(f"Deleting Employee: {emp.first_name} {emp.last_name} (ID: {emp.id})")
                
                # Delete associated user if exists
                if emp.user_id:
                    user = db.query(User).filter(User.id == emp.user_id).first()
                    if user:
                        print(f"  - Deleting associated User: {user.username} (ID: {user.id})")
                        db.delete(user)
                
                db.delete(emp)
        
        db.commit()
        print("Deletion complete.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_dummies()
