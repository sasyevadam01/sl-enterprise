from database import SessionLocal
from models.logistics import LogisticsRequest
from sqlalchemy.orm import joinedload

def simulate_api():
    db = SessionLocal()
    try:
        print("Starting simulation of list_requests logic...")
        query = db.query(LogisticsRequest).options(
            joinedload(LogisticsRequest.material_type),
            joinedload(LogisticsRequest.banchina),
            joinedload(LogisticsRequest.requester),
            joinedload(LogisticsRequest.assigned_to)
        )
        # Filter active
        # Replicate enrich_request_response
        from routers.logistics import enrich_request_response
        
        results = query.all()
        print(f"Found {len(results)} active requests.")
        
        for r in results:
            print(f"Enriching ID {r.id}...")
            data = enrich_request_response(r)
            print(f"   Success: {data['material_type_label']}")
        
        # Test counts
        pending_count = db.query(LogisticsRequest).filter(LogisticsRequest.status == "pending").count()
        print(f"✅ Success! Pending count: {pending_count}")
        
    except Exception as e:
        print(f"❌ CRASH DETECTED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    simulate_api()
