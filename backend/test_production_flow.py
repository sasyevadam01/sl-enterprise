"""
Test per verificare il flusso production dal vivo
"""
from database import SessionLocal, User
from models.production import BlockRequest
from sqlalchemy.orm import joinedload

db = SessionLocal()

print("=" * 60)
print("TEST FLUSSO PRODUZIONE DAL VIVO")
print("=" * 60)

# Test come utente supply (Liccardi)
user = db.query(User).filter(User.username == 'Liccardi').first()
if not user:
    print("ERRORE: Utente Liccardi non trovato!")
    exit()

print(f"\nUser: {user.username}, Role: {user.role}")
print(f"Has manage_production_supply: {user.has_permission('manage_production_supply')}")
print(f"Has create_production_orders: {user.has_permission('create_production_orders')}")

is_supply = user.has_permission("manage_production_supply") or user.role == "super_admin"
is_order = user.has_permission("create_production_orders")

print(f"\nis_supply: {is_supply}, is_order: {is_order}")

# Query come nel router
query = db.query(BlockRequest).options(
    joinedload(BlockRequest.material),
    joinedload(BlockRequest.density),
    joinedload(BlockRequest.color),
    joinedload(BlockRequest.supplier),
    joinedload(BlockRequest.created_by),
    joinedload(BlockRequest.processed_by)
)

# La logica critica
if is_order and not is_supply:
    query = query.filter(BlockRequest.created_by_id == user.id)
    print("\n*** FILTERING by user ID - vede solo i suoi ordini! ***")
else:
    print("\n*** NO FILTER - vede tutti gli ordini ***")

results = query.all()
print(f"\nRisultati totali: {len(results)} richieste")

pending = [r for r in results if r.status == 'pending']
processing = [r for r in results if r.status == 'processing']

print(f"  - Pending: {len(pending)}")
print(f"  - Processing: {len(processing)}")

print("\nDettaglio richieste pending:")
for r in pending:
    mat = r.material.label if r.material else (f"{r.density.label} {r.color.label}" if r.density else "N/A")
    print(f"  - ID {r.id}: {mat} x{r.quantity} - creato da {r.created_by.username if r.created_by else 'N/A'}")

db.close()
print("\n" + "=" * 60)
print("TEST COMPLETATO")
print("=" * 60)
