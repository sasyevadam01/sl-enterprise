import sys
sys.path.append('backend')
from sqlalchemy import create_engine, inspect
from backend.database import DATABASE_URL

def check_structure():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('fleet_checklists')]
    print(f"Columns in fleet_checklists: {columns}")
    
    needed = ['resolution_notes', 'resolved_at', 'resolved_by']
    missing = [c for c in needed if c not in columns]
    
    if missing:
        print(f"❌ MISSING COLUMNS: {missing}")
    else:
        print("✅ All columns present.")

if __name__ == "__main__":
    check_structure()
