from database import SessionLocal, User
from security import get_password_hash
import sys

def force_reset():
    db = SessionLocal()
    try:
        # 1. Reset 'admin'
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print(f"Found user 'admin' (ID: {admin_user.id}). Resetting password...")
            admin_user.password_hash = get_password_hash("admin")
            admin_user.is_active = True
            admin_user.role = "super_admin"
        else:
            print("User 'admin' not found. Creating...")
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin"),
                full_name="Super Administrator",
                role="super_admin",
                is_active=True
            )
            db.add(admin_user)
        
        # 2. Create emergency 'superuser'
        super_user = db.query(User).filter(User.username == "superuser").first()
        if super_user:
            print(f"Found user 'superuser' (ID: {super_user.id}). updating password...")
            super_user.password_hash = get_password_hash("password123")
            super_user.is_active = True
            super_user.role = "super_admin"
        else:
            print("Creating backup 'superuser'...")
            super_user = User(
                username="superuser",
                password_hash=get_password_hash("password123"),
                full_name="Backup Admin",
                role="super_admin",
                is_active=True
            )
            db.add(super_user)
            
        db.commit()
        print("\nSUCCESS! Credentials updated.")
        print("1. User: 'admin'      Password: 'admin'")
        print("2. User: 'superuser'  Password: 'password123'")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    force_reset()
