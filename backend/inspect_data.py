from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base import Base
from models.factory import Banchina, Machine
from models.shifts import ShiftRequirement
from models.hr import Employee
from models.core import Department
from models.fleet import FleetVehicle

# Connect to DB
DATABASE_URL = "sqlite:///./sl_enterprise.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("=== BANCHINE ===")
banchine = db.query(Banchina).all()
for b in banchine:
    print(f"ID: {b.id}, Code: {b.code}, Name: {b.name}")

print("\n=== SHIFT REQUIREMENTS (Postazioni KPI) ===")
reqs = db.query(ShiftRequirement).all()
for r in reqs:
    print(f"ID: {r.id}, Role: {r.role_name}, Banchina ID: {r.banchina_id}, KPI Target: {r.kpi_target}")

print("\n=== MACHINES ===")
machines = db.query(Machine).all()
for m in machines:
    print(f"ID: {m.id}, Name: {m.name}, Type: {m.machine_type}, Active: {m.is_active}")

print("\n=== SEARCH 'SERVIZI GENERALI' ===")
# Search in requirements
res = db.query(ShiftRequirement).filter(ShiftRequirement.kpi_sector.like("%Servizi Generali%")).all()
for r in res:
    print(f"[REQ] ID: {r.id}, Role: {r.role_name}, Sector: {r.kpi_sector}")

# Search in departments
res = db.query(Department).filter(Department.name.like("%Servizi Generali%")).all()
for d in res:
    print(f"[DEPT] ID: {d.id}, Name: {d.name}")

db.close()
