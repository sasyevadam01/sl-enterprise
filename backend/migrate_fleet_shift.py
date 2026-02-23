"""
Migrazione: Aggiunge colonna 'shift' a fleet_checklists.
Valori: 'morning' (06:00-12:30) | 'evening' (14:00-21:30)

Uso: python migrate_fleet_shift.py
"""
from database import engine
from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('fleet_checklists')]
    
    if 'shift' in columns:
        print("✅ Colonna 'shift' già presente. Nessuna modifica necessaria.")
        return
    
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE fleet_checklists ADD COLUMN shift VARCHAR(10)"))
    
    print("✅ Colonna 'shift' aggiunta a fleet_checklists con successo.")

if __name__ == "__main__":
    migrate()
