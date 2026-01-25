"""
SL Enterprise - Logistics Data Seed
Inizializza dati di default per il sistema Richiesta Materiale.
Eseguire: python init_logistics_data.py
"""
from database import SessionLocal
from models.logistics import (
    LogisticsMaterialType, LogisticsPresetMessage, 
    LogisticsEtaOption, LogisticsConfig
)


def seed_material_types(db):
    """Tipi di materiale richiedibili."""
    materials = [
        {"label": "Cartoni Guanciali", "icon": "📦", "category": "imballo", "display_order": 1},
        {"label": "Cartoni Materassi STV", "icon": "📦", "category": "imballo", "display_order": 2},
        {"label": "Cartoni Piegati + STV", "icon": "📦", "category": "imballo", "display_order": 3},
        {"label": "Bobine Imbustatrice Grassi", "icon": "🧵", "category": "materie_prime", "display_order": 4},
        {"label": "Bobine Imbustatrice Premium", "icon": "🧵", "category": "materie_prime", "display_order": 5},
        {"label": "Pedane Vuote", "icon": "🎯", "category": "logistica", "display_order": 6},
        {"label": "Ritiro Pedane Pronte", "icon": "🚛", "category": "logistica", "display_order": 7},
        {"label": "Cambio Carrello Sfrido", "icon": "♻️", "category": "logistica", "display_order": 8},
        {"label": "Cerniere", "icon": "🔗", "category": "materie_prime", "display_order": 9},
        {"label": "Tessuto", "icon": "🧵", "category": "materie_prime", "requires_description": True, "display_order": 10},
        {"label": "Altro", "icon": "➕", "category": "altro", "requires_description": True, "display_order": 99},
    ]
    
    for m in materials:
        existing = db.query(LogisticsMaterialType).filter(
            LogisticsMaterialType.label == m["label"]
        ).first()
        if not existing:
            db.add(LogisticsMaterialType(**m))
            print(f"[OK] Creato tipo materiale: {m['label']}")
    
    db.commit()


def seed_preset_messages(db):
    """Messaggi preimpostati per comunicazione veloce."""
    messages = [
        {"content": "Sto arrivando!", "icon": "🏃", "display_order": 1},
        {"content": "In coda al retrattile", "icon": "⏳", "display_order": 2},
        {"content": "Carico altre pedane, poi vengo", "icon": "📦", "display_order": 3},
        {"content": "Materiale non disponibile", "icon": "❌", "display_order": 4},
        {"content": "Devo prima finire altra consegna", "icon": "🔄", "display_order": 5},
        {"content": "Arrivo tra 2 minuti", "icon": "⏱️", "display_order": 6},
    ]
    
    for m in messages:
        existing = db.query(LogisticsPresetMessage).filter(
            LogisticsPresetMessage.content == m["content"]
        ).first()
        if not existing:
            db.add(LogisticsPresetMessage(**m))
            print(f"[OK] Creato messaggio preset: {m['content']}")
    
    db.commit()


def seed_eta_options(db):
    """Opzioni ETA selezionabili dal magazziniere."""
    options = [
        {"minutes": 5, "label": "5 min", "display_order": 1},
        {"minutes": 10, "label": "10 min", "display_order": 2},
        {"minutes": 15, "label": "15 min", "display_order": 3},
        {"minutes": 20, "label": "20 min", "display_order": 4},
        {"minutes": 30, "label": "30+ min", "display_order": 5},
    ]
    
    for o in options:
        existing = db.query(LogisticsEtaOption).filter(
            LogisticsEtaOption.minutes == o["minutes"]
        ).first()
        if not existing:
            db.add(LogisticsEtaOption(**o))
            print(f"[OK] Creata opzione ETA: {o['label']}")
    
    db.commit()


def seed_config(db):
    """Configurazioni sistema punti e penalità."""
    configs = [
        # Punti positivi
        {"config_key": "points_base_mission", "config_value": "1", "description": "Punti base per missione completata in tempo"},
        {"config_key": "points_urgent_mission", "config_value": "2", "description": "Punti per missione URGENTE completata"},
        {"config_key": "points_super_speed_bonus", "config_value": "1", "description": "Bonus se consegna in meno di metà ETA"},
        {"config_key": "points_save_abandoned", "config_value": "1", "description": "Punti per salvare task abbandonata"},
        
        # Penalità
        {"config_key": "penalty_late_light", "config_value": "1", "description": "Penalità ritardo lieve (1-5 min oltre ETA)"},
        {"config_key": "penalty_late_medium", "config_value": "2", "description": "Penalità ritardo medio (5-15 min oltre ETA)"},
        {"config_key": "penalty_late_severe", "config_value": "3", "description": "Penalità ritardo grave (>15 min oltre ETA)"},
        {"config_key": "penalty_release_task", "config_value": "1", "description": "Penalità per rilascio task"},
        {"config_key": "penalty_urgency_received", "config_value": "1", "description": "Penalità per sollecito ricevuto"},
        
        # Soglie
        {"config_key": "threshold_late_light_minutes", "config_value": "5", "description": "Soglia ritardo lieve (minuti)"},
        {"config_key": "threshold_late_medium_minutes", "config_value": "15", "description": "Soglia ritardo medio (minuti)"},
        {"config_key": "threshold_sla_warning_minutes", "config_value": "3", "description": "Soglia SLA per alert coordinatore (minuti)"},
    ]
    
    for c in configs:
        existing = db.query(LogisticsConfig).filter(
            LogisticsConfig.config_key == c["config_key"]
        ).first()
        if not existing:
            db.add(LogisticsConfig(**c))
            print(f"[OK] Creata config: {c['config_key']} = {c['config_value']}")
    
    db.commit()


def seed_all():
    """Esegue tutti i seed."""
    db = SessionLocal()
    try:
        print("\n=== SEED LOGISTICS DATA ===\n")
        
        print("1. Tipi Materiale...")
        seed_material_types(db)
        
        print("\n2. Messaggi Preimpostati...")
        seed_preset_messages(db)
        
        print("\n3. Opzioni ETA...")
        seed_eta_options(db)
        
        print("\n4. Configurazioni Sistema...")
        seed_config(db)
        
        print("\n=== SEED COMPLETATO ===\n")
        
    except Exception as e:
        print(f"[ERRORE] {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
