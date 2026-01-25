from database import SessionLocal
from models.logistics import LogisticsRequest
from datetime import datetime

def debug_requests():
    db = SessionLocal()
    try:
        requests = db.query(LogisticsRequest).all()
        print(f"Total requests: {len(requests)}")
        for r in requests:
            try:
                # Test properties
                w = r.wait_time_seconds
                o = r.is_overdue
                
                # Test relations
                mt = r.material_type.label if r.material_type else "No MT"
                req = r.requester.full_name if r.requester else "No Req"
                
                print(f"ID {r.id}: {mt} by {req}, Wait: {w}")
            except Exception as e:
                print(f"❌ Error on ID {r.id}: {e}")
                print(f"   Data: created_at={r.created_at}, taken_at={r.taken_at}, material_type_id={r.material_type_id}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_requests()
