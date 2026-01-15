
import pandas as pd
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, ShiftRequirement, Banchina
from sqlalchemy import func

EXCEL_PATH = "Macchine_Ruoli_Banchine.xlsx"

def sync_postazioni():
    db = SessionLocal()
    try:
        EXCEL_PATH_FINAL = EXCEL_PATH
        if not os.path.exists(EXCEL_PATH_FINAL):
            # Try looking in parent dir
            if os.path.exists(os.path.join("..", EXCEL_PATH)):
                 EXCEL_PATH_FINAL = os.path.join("..", EXCEL_PATH)
            else:
                print(f"ERROR: {EXCEL_PATH} not found.")
                return

        print(f"Loading {EXCEL_PATH_FINAL}...")
        df = pd.read_excel(EXCEL_PATH_FINAL)
        
        # Load Map for Banchine (Code -> ID)
        print("--- Loading Banchine Map ---")
        banchine = db.query(Banchina).all()
        # Map both Code and Name to ID.
        # Codes are often integers in DB but strings in concept.
        banchina_map = {}
        for b in banchine:
            banchina_map[str(b.code)] = b.id
            if b.name:
                banchina_map[b.name.lower()] = b.id
        
        print(f"Loaded {len(banchina_map)} banchine mappings.")

        updated_count = 0
        
        for _, row in df.iterrows():
            role_name = str(row['Macchinario / Ruolo']).strip()
            if not role_name or role_name.lower() == 'nan':
                 continue
                 
            # Find Requirement
            req = db.query(ShiftRequirement).filter(
                func.lower(ShiftRequirement.role_name) == role_name.lower()
            ).first()
            
            if req:
                # 1. Update KPI Sector
                kpi_col_val = row.get('corrispondenza foglio KPI')
                kpi_sector = None
                requires_kpi = False
                
                if pd.notna(kpi_col_val) and str(kpi_col_val).strip() != '':
                     kpi_sector = str(kpi_col_val).strip()
                     requires_kpi = True
                
                # Check if requires_kpi column exists (dynamic check since model might not have it yet in local execution context if not updated)
                # But here we are using ORM. If we haven't updated the model file yet, this might fail if we try to access .requires_kpi
                # So we must update the model file FIRST.
                # Assuming model file IS updated or we handle via __dict__ or matching raw SQL update?
                # Better to rely on the model being updated.
                
                req.kpi_sector = kpi_sector
                req.requires_kpi = requires_kpi
                
                # 2. Update Banchina ID
                raw_banchina = row['banchina']
                if pd.notna(raw_banchina):
                    # Handle "Esterno"
                    key = str(raw_banchina).strip().lower()
                    if isinstance(raw_banchina, float):
                        key = str(int(raw_banchina))
                    
                    if key in banchina_map:
                        req.banchina_id = banchina_map[key]
                    else:
                        pass # print(f"Banchina not found: {raw_banchina}")
                
                updated_count += 1
        
        db.commit()
        
        # Post-process: Update `requires_kpi` using Raw SQL to be safe if model isn't updated yet
        conn = db.connection()
        # Check if column exists first? 
        # Usually checking via ORM is safer if models are synced. 
        # I'll rely on the `add_requires_kpi_column.py` being run first.
        
        print(f"Synced {updated_count} postazioni.")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_postazioni()
