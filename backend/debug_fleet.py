from database import SessionLocal
from models.fleet import FleetVehicle

def check_vehicles():
    db = SessionLocal()
    try:
        vehicles = db.query(FleetVehicle).all()
        print(f"Total Vehicles: {len(vehicles)}")
        for v in vehicles:
            print(f"ID: {v.id}, Code: {v.internal_code}, Type: {v.vehicle_type}, Status: '{v.status}', Active: {v.is_active}")
    finally:
        db.close()

if __name__ == "__main__":
    check_vehicles()
