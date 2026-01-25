from database import engine
from sqlalchemy import inspect, text

def check_structure():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('logistics_requests')]
    print(f"Colonne in logistics_requests: {columns}")
    
    if 'unit_of_measure' in columns:
        print("✅ La colonna 'unit_of_measure' ESISTE.")
        
        # Check values
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, unit_of_measure FROM logistics_requests LIMIT 5")).fetchall()
            print("Esempio dati:", result)
    else:
        print("❌ La colonna 'unit_of_measure' NON ESISTE.")

if __name__ == "__main__":
    check_structure()
