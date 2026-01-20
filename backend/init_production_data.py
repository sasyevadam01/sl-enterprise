"""
SL Enterprise - Production Data Seed
Popola il database con i materiali e colori per la Picking List.
Eseguire: python init_production_data.py
"""
from database import SessionLocal
from models.production import ProductionMaterial

DATA = [
    # --- MEMORY ---
    {"category": "memory", "label": "EM40 BIANCO", "value": "#FFFFFF", "display_order": 1},
    {"category": "memory", "label": "EM40 BLU", "value": "#0000FF", "display_order": 2},
    {"category": "memory", "label": "EM45 ALOE", "value": "#90EE90", "display_order": 3},
    {"category": "memory", "label": "EM40 YLANG", "value": "#FFFF00", "display_order": 4},
    {"category": "memory", "label": "EM40 VITAMINIC", "value": "#FFA500", "display_order": 5},
    {"category": "memory", "label": "EM40 GINSENG", "value": "#FF0000", "display_order": 6},
    {"category": "memory", "label": "EM40 COOLGEL", "value": "#87CEEB", "display_order": 7},
    {"category": "memory", "label": "EM40 VIOLA", "value": "#800080", "display_order": 8},
    {"category": "memory", "label": "EM40 XFORM", "value": "#808080", "display_order": 9},
    {"category": "memory", "label": "MEMORY IGNIFUGO", "value": "#D3D3D3", "display_order": 10},
    
    # --- SPUGNA: DENSITÀ ---
    {"category": "sponge_density", "label": "D18", "value": "18", "display_order": 1},
    {"category": "sponge_density", "label": "D21", "value": "21", "display_order": 2},
    {"category": "sponge_density", "label": "D23", "value": "23", "display_order": 3},
    {"category": "sponge_density", "label": "D25", "value": "25", "display_order": 4},
    {"category": "sponge_density", "label": "D27", "value": "27", "display_order": 5},
    {"category": "sponge_density", "label": "D30", "value": "30", "display_order": 6},
    {"category": "sponge_density", "label": "D35", "value": "35", "display_order": 7},
    {"category": "sponge_density", "label": "D40", "value": "40", "display_order": 8},
    
    # --- SPUGNA: COLORI ---
    {"category": "sponge_color", "label": "BIANCO", "value": "#FFFFFF", "display_order": 1},
    {"category": "sponge_color", "label": "CELESTE", "value": "#87CEEB", "display_order": 2},
    {"category": "sponge_color", "label": "ROSA", "value": "#FFC0CB", "display_order": 3},
    {"category": "sponge_color", "label": "NERO", "value": "#000000", "display_order": 4},
    {"category": "sponge_color", "label": "ANTRACITE", "value": "#2F4F4F", "display_order": 5},
    {"category": "sponge_color", "label": "ARANCIO", "value": "#FFA500", "display_order": 6},
    {"category": "sponge_color", "label": "ROSSO", "value": "#FF0000", "display_order": 7},
    {"category": "sponge_color", "label": "VERDE CHIARO", "value": "#90EE90", "display_order": 8},
    {"category": "sponge_color", "label": "VERDE ACCESO", "value": "#00FF00", "display_order": 9},
    {"category": "sponge_color", "label": "BLU ELETTRICO", "value": "#0000CD", "display_order": 10},
    {"category": "sponge_color", "label": "IGNIFUGO MARRONCINO", "value": "#8B4513", "display_order": 11},
    {"category": "sponge_color", "label": "IGNIFUGO NERO", "value": "#1C1C1C", "display_order": 12},
    
    # --- DIMENSIONI BLOCCHI ---
    {"category": "block_dimension", "label": "120x200", "value": "120x200", "display_order": 1},
    {"category": "block_dimension", "label": "160x190", "value": "160x190", "display_order": 2},
    {"category": "block_dimension", "label": "160x200", "value": "160x200", "display_order": 3},
    {"category": "block_dimension", "label": "180x200", "value": "180x200", "display_order": 4},
    {"category": "block_dimension", "label": "200x200", "value": "200x200", "display_order": 5},
    
    # --- FORNITORI ---
    {"category": "supplier", "label": "SITAB", "value": "SITAB", "display_order": 1},
    {"category": "supplier", "label": "IMPE", "value": "IMPE", "display_order": 2},
    {"category": "supplier", "label": "OLMO", "value": "OLMO", "display_order": 3},
    {"category": "supplier", "label": "NEW WIND", "value": "NEW WIND", "display_order": 4},
    {"category": "supplier", "label": "LAREG2", "value": "LAREG2", "display_order": 5},
]

def seed_production_data():
    db = SessionLocal()
    try:
        count = 0
        for item in DATA:
            existing = db.query(ProductionMaterial).filter(
                ProductionMaterial.category == item["category"],
                ProductionMaterial.label == item["label"]
            ).first()
            
            if not existing:
                new_item = ProductionMaterial(**item)
                db.add(new_item)
                count += 1
                
        db.commit()
        if count > 0:
            print(f"[OK] Creati {count} materiali/colori produzione.")
        else:
            print("[OK] Dati produzione gia presenti.")
            
    except Exception as e:
        print(f"[ERROR] Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_production_data()
