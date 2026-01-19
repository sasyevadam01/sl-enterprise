import sys
from database import SessionLocal
from models.production import BlockRequest, ProductionMaterial

def test_insert():
    db = SessionLocal()
    try:
        # 1. Check if materials exist
        mat = db.query(ProductionMaterial).first()
        if not mat:
            print("❌ ERRORE: Nessun materiale trovato nel DB!")
            return

        print(f"✅ Trovato materiale: {mat.label} (ID: {mat.id})")

        # 2. Try simple insert for Memory
        print("➡️ Tentativo creazione richiesta Memory...")
        req = BlockRequest(
            request_type="memory",
            material_id=mat.id,
            dimensions="160x190",
            quantity=1,
            created_by_id=1, # Admin
            status="pending",
            client_ref=None # Testing null
        )
        db.add(req)
        db.commit()
        print(f"✅ Successo! Richiesta ID: {req.id} creata.")
        
        # Cleanup
        db.delete(req)
        db.commit()
        print("🗑️ Richiesta test eliminata.")

    except Exception as e:
        print(f"❌ CRASH: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_insert()
