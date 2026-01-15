from database import SessionLocal
from models.core import User

def compare_users():
    db = SessionLocal()
    try:
        users_to_check = ['Marino', 'Brescia']
        print(f"--- COMPARING USERS: {users_to_check} ---")
        
        for name_part in users_to_check:
            # Flexible search by name
            user = db.query(User).filter(User.username.ilike(f"%{name_part}%")).first()
            if not user:
                 user = db.query(User).filter(User.full_name.ilike(f"%{name_part}%")).first()
            
            if user:
                print(f"\nUser: {user.username} ({user.full_name})")
                print(f"Role Field (Legacy): '{user.role}'")
                print(f"Role ID: {user.role_id}")
                if user.role_obj:
                    print(f"Role Object Name: '{user.role_obj.name}'")
                    print(f"Role Object Permissions: {user.role_obj.permissions}")
                else:
                    print("Role Object: None")
                    
                print(f"Computed Permissions (Final): {user.permissions}")
            else:
                print(f"\nUser matching '{name_part}' not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    compare_users()
