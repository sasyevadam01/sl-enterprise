
from database import SessionLocal, User, Role

db = SessionLocal()

print(f"{'ID':<5} {'USERNAME':<20} {'ROLE (Legacy)':<20} {'ROLE ID (New)':<15} {'ROLE OBJ'}")
print("-" * 80)

users = db.query(User).all()
for u in users:
    role_obj_name = u.role_obj.name if u.role_obj else "None"
    print(f"{u.id:<5} {u.username:<20} {u.role:<20} {str(u.role_id):<15} {role_obj_name}")

print("-" * 80)
db.close()
