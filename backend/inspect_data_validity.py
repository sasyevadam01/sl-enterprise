from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Setup DB
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Import App Models & Schemas
try:
    from database import Employee, EmployeeEvent, LeaveRequest
    from schemas import EmployeeListResponse
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def inspect():
    print("--- INSPECTOR GADGET VALIDATION ---")
    employees = db.query(Employee).all()
    print(f"Found {len(employees)} raw records in DB.")
    
    valid_count = 0
    invalid_count = 0
    
    print("\nChecking Schema Compatibility...")
    
    for i, emp in enumerate(employees):
        try:
            # Simulate what the API does
            result = EmployeeListResponse.model_validate(emp)
            valid_count += 1
        except Exception as e:
            invalid_count += 1
            print(f"❌ INVALID RECORD [ID: {emp.id} - {emp.first_name} {emp.last_name}]")
            print(f"   Reason: {e}")
            # Stop after 3 failures to avoid spam
            if invalid_count >= 3:
                print("... (Stopping error log after 3 failures)")
                break

    print("\n--- REPORT ---")
    print(f"✅ Valid Records: {valid_count}")
    print(f"❌ Invalid Records: {invalid_count}")
    
    if invalid_count > 0:
        print("\nCONCLUSION: The API is crashing because of these invalid records!")
    else:
        print("\nCONCLUSION: Data is valid. The issue is likely network or frontend.")

    db.close()

if __name__ == "__main__":
    inspect()
