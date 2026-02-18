"""
Migrazione: Crea tabella 'oven_items' per Il Forno.

Uso: python migrate_oven.py
"""
from database import engine
from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    
    if inspector.has_table('oven_items'):
        print("✅ Tabella 'oven_items' già presente. Nessuna modifica necessaria.")
        return
    
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE oven_items (
                id SERIAL PRIMARY KEY,
                item_type VARCHAR(30) NOT NULL,
                reference VARCHAR(200) NOT NULL,
                description VARCHAR(300),
                quantity INTEGER DEFAULT 1,
                operator_id INTEGER NOT NULL REFERENCES users(id),
                inserted_at TIMESTAMP DEFAULT NOW(),
                expected_minutes INTEGER DEFAULT 180,
                removed_at TIMESTAMP,
                removed_by INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'in_oven',
                notes TEXT
            )
        """))
    
    print("✅ Tabella 'oven_items' creata con successo.")

if __name__ == "__main__":
    migrate()
