"""
Script per aggiungere 'Permesso Improvviso' come tipo evento con -1 punti.
Eseguire una sola volta.
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal
from models.hr import EventType

def add_permesso_improvviso():
    db = SessionLocal()
    try:
        # Controlla se esiste già
        existing = db.query(EventType).filter(EventType.label == "Permesso Improvviso").first()
        if existing:
            print(f"✅ 'Permesso Improvviso' esiste già (ID: {existing.id}, punti: {existing.default_points})")
            return
        
        # Crea nuovo tipo evento
        new_type = EventType(
            label="Permesso Improvviso",
            default_points=-1,
            severity="warning",
            icon="⚡"
        )
        db.add(new_type)
        db.commit()
        db.refresh(new_type)
        print(f"✅ Aggiunto 'Permesso Improvviso' (ID: {new_type.id}, punti: -1)")
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_permesso_improvviso()
