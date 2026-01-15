from database import SessionLocal
from models.core import User

def debug_users():
    db = SessionLocal()
    try:
        # Find users with coordinator role
        users = db.query(User).filter(User.role == 'coordinator').all()
        print(f"Found {len(users)} users with role 'coordinator'")
        
        for u in users:
            print(f"--- User: {u.username} ---")
            print(f"Full Name: {u.full_name}")
            print(f"Role Field: '{u.role}'")
            print(f"Role ID: {u.role_id}")
            print(f"Role Obj: {u.role_obj}")
            print(f"Permissions Property: {u.permissions}")
            print("---------------------------")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_users()
