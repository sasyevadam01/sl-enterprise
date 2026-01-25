from database import SessionLocal, engine
from models.fleet import Base, FleetVehicle
import sys

def init_vehicles():
    db = SessionLocal()
    
    # List derived from the image provided
    # Format: Type, Brand, Code, Is40
    vehicles_data = [
        # RETRATTILI
        ("Retrattile", "JUNGHEINRICH", "29", False),
        ("Retrattile", "JUNGHEINRICH", "44", False),
        ("Retrattile", "MITSUBISHI", "51", True),
        ("Retrattile", "HYSTER", "33", False),
        ("Retrattile", "MITSUBISHI", "4", False),
        ("Retrattile", "HYSTER", "18", False),
        ("Retrattile", "MITSUBISHI", "53", True),
        ("Retrattile", "HYSTER", "34", False),
        ("Retrattile", "JUNGHEINRICH", "19", False),
        ("Retrattile", "JUNGHEINRICH", "27", False),
        ("Retrattile", "MITSUBISHI", "42", True),
        
        # RETRATTILE JOLLY
        ("Retrattile Jolly", "MITSUBISHI", "23", False),
        
        # RETRATTILE BLOCCHI
        ("Retrattile Blocchi", "MITSUBISHI", "41", True),
        ("Retrattile Blocchi", "MITSUBISHI", "37", True),
        ("Retrattile Blocchi", "MITSUBISHI", "50", True),
        
        # CARRELLI FRONTALI
        ("Carrello Frontale", "MITSUBISHI", "12", False),
        ("Carrello Frontale", "HYSTER", "8", False),
        ("Carrello Frontale", "JUNGHEINRICH", "14", False),
        ("Carrello Frontale", "HYSTER", "9", False),
        ("Carrello Frontale", "MITSUBISHI", "38", True),
        
        # CARRELLO FRONT BLOCCHI
        ("Carrello Front. Blocchi", "MITSUBISHI", "3", False),
    ]

    print(f"Checking {len(vehicles_data)} vehicles...")

    for v_type, brand, code, is_40 in vehicles_data:
        # Check by internal code
        existing = db.query(FleetVehicle).filter(FleetVehicle.internal_code == code).first()
        
        if not existing:
            print(f"Creating {brand} {code} ({v_type})...")
            new_vehicle = FleetVehicle(
                vehicle_type=v_type,
                brand=brand,
                internal_code=code,
                model=f"{brand} {code}", # Placeholder model
                is_4_0=is_40,
                status='operational',
                is_active=True
            )
            db.add(new_vehicle)
        else:
            print(f"Vehicle {code} already exists. Updating info...")
            existing.vehicle_type = v_type
            existing.brand = brand
            existing.is_4_0 = is_40
            # We do NOT update location/banchina as requested "mezzi sciolti"
            
    db.commit()
    db.close()
    print("Vehicle seeding completed.")

if __name__ == "__main__":
    init_vehicles()
