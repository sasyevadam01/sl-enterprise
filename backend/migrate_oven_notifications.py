"""
Migrazione: Aggiunge colonna 'notified_overdue' alla tabella 'oven_items'.

Uso: python migrate_oven_notifications.py
"""
from database import engine
from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    
    if not inspector.has_table('oven_items'):
        print("❌ Tabella 'oven_items' non trovata. Esegui prima migrate_oven.py")
        return
    
    cols = [c['name'] for c in inspector.get_columns("oven_items")]
    if "notified_overdue" in cols:
        print("✅ Colonna 'notified_overdue' già presente.")
        return
    
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE oven_items ADD COLUMN notified_overdue BOOLEAN DEFAULT FALSE"))
    
    print("✅ Colonna 'notified_overdue' aggiunta con successo.")

if __name__ == "__main__":
    migrate()
