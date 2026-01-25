from sqlalchemy import create_engine, text

# Hardcoded path to ROOT db
DB_PATH = r"c:\Users\sasys\Desktop\VERSIONE PORTABLE\SL Project\sl_enterprise.db"
engine = create_engine(f"sqlite:///{DB_PATH}")

def check_permissions_raw():
    with engine.connect() as conn:
        # Check Users
        print("Checking Users table via RAW SQL...")
        result = conn.execute(text("SELECT id, username, role, role_id FROM users")).fetchall()
        print(f"Total users found: {len(result)}")
        for row in result:
            print(f"User: {row.username} | Role: {row.role} | RoleID: {row.role_id}")
            
        # Check Request 15
        print("\nChecking Request #15...")
        req = conn.execute(text("SELECT id, confirmation_code, status, requester_id FROM logistics_requests WHERE id = 15")).fetchone()
        if req:
            print(f"Request 15 found -> Code: '{req.confirmation_code}', Status: {req.status}, RequesterID: {req.requester_id}")
        else:
            print("Request 15 NOT FOUND")

if __name__ == "__main__":
    check_permissions_raw()
