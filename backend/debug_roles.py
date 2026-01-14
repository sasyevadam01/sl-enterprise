from database import SessionLocal
from models.core import User, Role

def debug_roles():
    db = SessionLocal()
    try:
        print("--- DEBUGGING ROLES & PERMISSIONS ---")
        
        # 1. Check Roles Table
        roles = db.query(Role).all()
        print(f"Total Roles found: {len(roles)}")
        if not roles:
            print("WARNING: Roles table is empty!")
        else:
            for r in roles:
                print(f"Role ID: {r.id}, Name: {r.name}, Permissions: {r.permissions}")

        # 2. Check Marino
        user = db.query(User).filter(User.username == 'Marino').first()
        if user:
            print(f"\n--- User: {user.username} ---")
            print(f"Legacy Role (string): '{user.role}'")
            print(f"Role ID (FK): {user.role_id}")
            print(f"Role Object: {user.role_obj}")
            
            # Test Property
            print(f"Computed Permissions: {user.permissions}")
        else:
            print("\nUser 'Marino' not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_roles()
