import sys
import os

# Aggiungi la directory parent al path per poter importare i moduli backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models.logistics import (
    LogisticsConfig, LogisticsEtaOption, LogisticsPresetMessage, LogisticsMaterialType, Base
)

def init_db():
    print("Inizializzazione Tabelle Logistica...")
    
    # Crea tutte le tabelle mancanti
    Base.metadata.create_all(bind=engine)
    print("Tabelle create (o già esistenti).")
    
    db = SessionLocal()
    try:
        # 1. Seeding Config
        print("Seeding Configurazione...")
        default_configs = {
            "points_base_mission": "10",
            "points_urgent_mission": "20",
            "points_super_speed_bonus": "5",
            "threshold_late_light_minutes": "5",
            "threshold_late_medium_minutes": "15",
            "penalty_late_light": "2",
            "penalty_late_medium": "5",
            "penalty_late_severe": "10",
            "penalty_release_task": "5",
            "penalty_urgency_received": "5"
        }
        
        for key, val in default_configs.items():
            existing = db.query(LogisticsConfig).filter_by(config_key=key).first()
            if not existing:
                print(f"  + Config: {key} = {val}")
                db.add(LogisticsConfig(config_key=key, config_value=val, description="Auto-generated"))
        
        # 2. Seeding ETA Options
        print("Seeding ETA Options...")
        if db.query(LogisticsEtaOption).count() == 0:
            options = [
                (5, "5 min"),
                (10, "10 min"),
                (15, "15 min"),
                (20, "20 min"),
                (30, "30+ min"),
            ]
            for mins, label in options:
                db.add(LogisticsEtaOption(minutes=mins, label=label, display_order=mins))
        
        # 3. Seeding Preset Messages
        print("Seeding Messaggi Preset...")
        if db.query(LogisticsPresetMessage).count() == 0:
            msgs = [
                ("Sto arrivando!", "🏃"),
                ("Ho preso il materiale, arrivo.", "📦"),
                ("Banchina occupata, attendo qualche minuto.", "⏳"),
                ("Non trovo il materiale, verifico.", "🔍"),
            ]
            for content, icon in msgs:
                db.add(LogisticsPresetMessage(content=content, icon=icon))
                
        db.commit()
        print("Inizializzazione COMPLETATA con successo!")
        
    except Exception as e:
        print(f"ERRORE durante l'inizializzazione: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
