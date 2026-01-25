from database import engine, Base
from sqlalchemy import text

def add_uom_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE logistics_requests ADD COLUMN unit_of_measure VARCHAR(20) DEFAULT 'pz'"))
            conn.commit()
            print("Colonna unit_of_measure aggiunta con successo!")
        except Exception as e:
            print(f"Errore (o colonna già presente): {e}")

if __name__ == "__main__":
    add_uom_column()
