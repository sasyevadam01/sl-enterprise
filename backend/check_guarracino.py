"""Quick check: Guarracino permissions"""
from database import engine
from sqlalchemy import text

with engine.connect() as c:
    # Find user
    users = c.execute(text(
        "SELECT id, username, full_name, role, role_id FROM users WHERE full_name LIKE '%Guarracino%'"
    )).fetchall()
    
    for u in users:
        print(f"User: id={u[0]}, username={u[1]}, name={u[2]}, role={u[3]}, role_id={u[4]}")
        
        # Get role permissions
        perms = c.execute(text(
            "SELECT p.permission_key FROM role_permissions rp "
            "JOIN permissions p ON p.id = rp.permission_id "
            "WHERE rp.role_id = :rid"
        ), {"rid": u[4]}).fetchall()
        
        perm_keys = [p[0] for p in perms]
        print(f"  Total permissions: {len(perm_keys)}")
        print(f"  Has use_oven: {'use_oven' in perm_keys}")
        print(f"  Has perform_checklists: {'perform_checklists' in perm_keys}")
        print(f"  Has view_checklist_history: {'view_checklist_history' in perm_keys}")
        print(f"  All permissions: {sorted(perm_keys)}")
