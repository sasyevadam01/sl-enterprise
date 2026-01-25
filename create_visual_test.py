from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.production import BlockRequest, ProductionMaterial
from datetime import datetime

# Database config
SQLALCHEMY_DATABASE_URL = "sqlite:///./sl_enterprise.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def create_test_orders():
    print("Creating visual test orders...")
    
    # Clean old test orders if any
    # db.query(BlockRequest).filter(BlockRequest.client_ref == "VISUAL_TEST").delete()

    # 1. PANTOGRAFO ORDER
    req1 = BlockRequest(
        request_type="sponge",
        density_id=1,  # Assuming ID 1 exists (from seed)
        color_id=2,    # Assuming ID 2 exists
        dimensions="VISUAL TEST PANTOGRAFO",
        quantity=5,
        target_sector="Pantografo",
        created_by_id=1, # Admin
        client_ref="VISUAL_TEST",
        status="pending",
        created_at=datetime.utcnow()
    )
    
    # 2. GIOSTRA ORDER
    req2 = BlockRequest(
        request_type="sponge",
        density_id=3,
        color_id=4, 
        dimensions="VISUAL TEST GIOSTRA",
        quantity=2,
        target_sector="Giostra",
        created_by_id=1, 
        client_ref="VISUAL_TEST",
        status="pending",
        created_at=datetime.utcnow()
    )

    db.add(req1)
    db.add(req2)
    db.commit()
    print("Orders created successfully!")

if __name__ == "__main__":
    try:
        create_test_orders()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Done.")
