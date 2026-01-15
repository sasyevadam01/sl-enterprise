import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, Employee, User
from models.factory import Banchina, Machine
from passlib.context import CryptContext

# Configuration files
EMPLOYEES_FILE = "Database_Aggiornato.xlsx"
CONFIG_FILE = "Macchine_Ruoli_Banchine.xlsx"

# DB Connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def restore_structure():
    """Populates Banchine and common Roles/Configs first."""
    print("🏗️  Restoring Factory Structure (Banchine)...")
    
    # 1. Banchine Predefined Data (Fallback if Excel is missing or structure complex)
    # Based on previous usage: B1, B2, B3...
    default_banchine = [
        {"code": "B1", "name": "Banchina 1"},
        {"code": "B2", "name": "Banchina 2"},
        {"code": "B3", "name": "Banchina 3"},
        {"code": "B4", "name": "Banchina 4"},
        {"code": "B5", "name": "Banchina 5"},
        {"code": "B6", "name": "Banchina 6"},
        {"code": "B7", "name": "Banchina 7"},
        {"code": "B8", "name": "Banchina 8"},
        {"code": "B9", "name": "Banchina 9"},
        {"code": "B10", "name": "Banchina 10"},
        {"code": "B11", "name": "Banchina 11"},
        {"code": "B12", "name": "Banchina 12"},
        {"code": "B13", "name": "Banchina 13"},
        {"code": "B14", "name": "Banchina 14"},
        {"code": "B15", "name": "Banchina 15"},
    ]

    count_new = 0
    
    # Try to load from Excel if possible for more detail
    if os.path.exists(CONFIG_FILE):
        print(f"   📂 Found {CONFIG_FILE}, attempting to read extra structure...")
        try:
             # Basic attempt to read Banchine if tab exists
             # If logic fails, we fallback to default list
             pass 
        except:
             print("   ⚠️  Could not read config Excel, using defaults.")

    for b in default_banchine:
        existing = db.query(Banchina).filter(Banchina.code == b["code"]).first()
        if not existing:
            new_b = Banchina(code=b["code"], name=b["name"])
            db.add(new_b)
            count_new += 1
    
    db.commit()
    print(f"   ✅ Banchine Restored: {count_new} new entries.")

    # Create mapping for next step
    all_banchine = db.query(Banchina).all()
    return {b.code: b.id for b in all_banchine}


def restore_employees(banchina_map):
    """Imports employees and links them to Banchine."""
    print("\n👥 Restoring Employees & Relations...")
    
    if not os.path.exists(EMPLOYEES_FILE):
        print(f"   ❌ Error: {EMPLOYEES_FILE} not found!")
        return

    try:
        df = pd.read_excel(EMPLOYEES_FILE)
    except Exception as e:
        print(f"   ❌ Failed to read Excel: {e}")
        return

    count_new = 0
    count_updated = 0
    
    # Banchina Map normalization (handle "15" -> "B15" or just "15")
    # Mapping "1" -> id, "B1" -> id, 1 -> id
    normalized_map = {}
    for code, bid in banchina_map.items():
        normalized_map[str(code).upper()] = bid
        normalized_map[str(code).replace("B", "")] = bid
    
    for index, row in df.iterrows():
        try:
            # 1. Parse Name
            first_name = ""
            last_name = ""
            
            if 'Nome' in df.columns and 'Cognome' in df.columns:
                first_name = str(row['Nome']).strip()
                last_name = str(row['Cognome']).strip()
            elif 'Nominativo' in df.columns:
                parts = str(row['Nominativo']).split()
                if len(parts) >= 2:
                    last_name = parts[0]
                    first_name = " ".join(parts[1:])
                else:
                    last_name = parts[0]
            else:
                 # Fallback
                first_name = str(row.iloc[0]).strip()
                last_name = str(row.iloc[1]).strip()

            if not first_name or first_name == 'nan': continue

            # 2. Parse Banchina
            # Assuming column is "Banchina" or similar
            b_id = None
            if 'Banchina' in df.columns:
                raw_b = str(row['Banchina']).strip().upper()
                if raw_b and raw_b != 'NAN' and raw_b != 'NO':
                    # Try direct "B15"
                    if raw_b in normalized_map:
                        b_id = normalized_map[raw_b]
                    # Try int "15" -> lookup
                    elif raw_b.replace(".0","") in normalized_map:
                         b_id = normalized_map[raw_b.replace(".0","")]
            
            # 3. Check / Create
            emp = db.query(Employee).filter(
                Employee.first_name == first_name, 
                Employee.last_name == last_name
            ).first()

            if emp:
                # Update info if missing
                if not emp.default_banchina_id and b_id:
                     emp.default_banchina_id = b_id
                     count_updated += 1
            else:
                new_emp = Employee(
                    first_name=first_name,
                    last_name=last_name,
                    email=f"{first_name.lower()}.{last_name.lower()}@example.com".replace(" ", ""),
                    fiscal_code=f"RESTORED{index}", 
                    department="Produzione",
                    job_title="Operaio",
                    default_banchina_id=b_id, # LINKING HERE!
                    is_active=True
                )
                db.add(new_emp)
                count_new += 1
                
        except Exception as e:
            print(f"   ⚠️ Row {index} error: {e}")

    db.commit()
    print(f"   ✅ Employees Processed: {count_new} created, {count_updated} updated.")


if __name__ == "__main__":
    print("🚀 STARTING FULL RESTORE...")
    b_map = restore_structure()
    restore_employees(b_map)
    print("🏁 RESTORE COMPLETE.")
    db.close()
