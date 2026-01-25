from database import engine
from models.fleet import Base, FleetChecklist

print("Updating database schema for Fleet Checklist...")
Base.metadata.create_all(bind=engine)
print("Done. FleetChecklist table should exist.")
