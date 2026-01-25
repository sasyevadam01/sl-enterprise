import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload
from backend.database import DATABASE_URL
# Import ALL models via database to ensure registry is populated
import backend.database 
from backend.models.shifts import ShiftRequirement
from backend.models.factory import Banchina 
from backend.models.fleet import FleetChecklist
from backend.routers.fleet import ChecklistResponse
from pydantic import ValidationError

def debug_load():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("Loading checklists...")
    checklists = db.query(FleetChecklist).options(joinedload(FleetChecklist.operator)).limit(50).all()
    print(f"Loaded {len(checklists)} checklists from DB.")
    
    for i, chk in enumerate(checklists):
        try:
            # Validate with Pydantic
            ChecklistResponse.from_orm(chk)
            # print(f"Checklist {chk.id} OK")
        except ValidationError as e:
            print(f"❌ Checklist {chk.id} VALIDATION ERROR:")
            print(e)
        except Exception as e:
            print(f"❌ Checklist {chk.id} RUNTIME ERROR: {e}")
            
    print("Done.")

if __name__ == "__main__":
    debug_load()
