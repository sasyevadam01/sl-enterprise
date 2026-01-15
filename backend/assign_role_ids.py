from database import SessionLocal
from models.core import User, Role

def fix_coordinator_ids():
    db = SessionLocal()
    try:
        # 1. Find the target Role ID for "coordinator"
        coord_role = db.query(Role).filter(Role.name == 'coordinator').first()
        if not coord_role:
            print("ERROR: Role 'coordinator' not found in DB!")
            return

        target_id = coord_role.id
        print(f"Target Role: {coord_role.name} (ID: {target_id})")

        # 2. Find users who are 'coordinator' but have NO role_id
        users = db.query(User).filter(
            User.role == 'coordinator',
            User.role_id == None
        ).all()
        
        print(f"Found {len(users)} users needing update.")

        # 3. Update them
        for u in users:
            print(f"Updating user: {u.username} -> Linking to Role ID {target_id}")
            u.role_id = target_id
            
        db.commit()
        print("Update Complete! All coordinators are now linked to the DB Role.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_coordinator_ids()
