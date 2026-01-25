import sys
import os

# Add 'backend' directory to sys.path so 'import models' works inside database.py
backend_dir = os.path.join(os.getcwd(), 'backend')
sys.path.append(backend_dir)

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, joinedload

# Importing database should trigger all model imports
import database # This corresponds to backend/database.py because we added backend to path

from models.fleet import FleetChecklist

def test_query():
    print("Connecting...")
    engine = create_engine(database.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("Running query...")
    # Mimic the router query
    query = db.query(FleetChecklist).options(joinedload(FleetChecklist.operator))
    
    # Try fetching 50 (limit from router)
    items = query.limit(50).all()
    print(f"Fetched {len(items)} items.")
    for item in items:
        valid_date = item.timestamp
        print(f"ID: {item.id}, Op: {item.operator.username if item.operator else 'None'}, Created: {valid_date}")
        print(f"Data Type: {type(item.checklist_data)}")
        # print(f"Data: {item.checklist_data}")
        
        # Test serialization manually
        try:
            from routers.fleet import ChecklistResponse
            # Force conversion
            res = ChecklistResponse.from_orm(item)
            # print("Serialized OK")
        except Exception as e:
            print(f"❌ SERIALIZATION ERROR for ID {item.id}: {e}")


if __name__ == "__main__":
    test_query()
