from database import SessionLocal
from models.fleet import FleetVehicle

def list_vehicles():
    db = SessionLocal()
    vs = db.query(FleetVehicle).limit(5).all()
    for v in vs:
        print(f"ID: {v.id}, Code: {v.internal_code}")
    db.close()

if __name__ == "__main__":
    list_vehicles()
