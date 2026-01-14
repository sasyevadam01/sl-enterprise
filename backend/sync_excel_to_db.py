import pandas as pd
import os
from sqlalchemy import func
from database import SessionLocal, Employee, Banchina, Department

# Check multiple logical paths for the Excel file
possible_paths = [
    "Database_Aggiornato.xlsx",         # Same folder (Docker/Server)
    os.path.join("..", "Database_Aggiornato.xlsx")  # Parent folder (Local Dev)
]
EXCEL_PATH = None
for p in possible_paths:
    if os.path.exists(p):
        EXCEL_PATH = p
        break

if not EXCEL_PATH:
    # Default to local for error message clarity, though it will be caught later
    EXCEL_PATH = "Database_Aggiornato.xlsx"

def sync_data():
    db = SessionLocal()
    try:
        # 1. Map Banchina Code -> ID
        print("--- Mapping Banchine ---")
        banchine = db.query(Banchina).all()
        # Code to ID (e.g., "11" -> 5)
        banchine_map = {str(b.code): b.id for b in banchine}
        print(f"Loaded {len(banchine_map)} banchine.")

        # 2. Load Excel
        if not os.path.exists(EXCEL_PATH):
            print(f"ERROR: Excel file not found at {EXCEL_PATH}")
            return

        print(f"Loading {EXCEL_PATH}...")
        df = pd.read_excel(EXCEL_PATH)
        
        updates_count = 0
        not_found_count = 0
        
        for _, row in df.iterrows():
            # Get Excel Data
            first_ex = str(row['Nome']).strip()
            last_ex = str(row['Cognome']).strip()
            
            # Banchina
            raw_banchina = row['Banchina']
            banchina_id = None
            try:
                raw_str = str(raw_banchina).strip()
                # Special Case: "Banchina Cortile" or just "Cortile"
                if "cortile" in raw_str.lower():
                    for k, v in banchine_map.items():
                        if k.lower() == "cortile":
                            banchina_id = v
                            break
                # Special Case: Magazzinieri with "No" -> Default to Cortile
                elif raw_str.lower() == "no" or raw_str == "nan":
                        raw_role = str(row.get('Macchine_ruoli', '')).lower()
                        raw_dept = str(row.get('Reparto', '')).lower()
                        
                        if 'magazziniere' in raw_role or 'magazzinieri' in raw_dept or 'retrattilista' in raw_role or 'transpallettista' in raw_role:
                            for k, v in banchine_map.items():
                                if k.lower() == "cortile":
                                    banchina_id = v
                                    break
                else:
                    code_str = str(int(raw_banchina)) if isinstance(raw_banchina, float) else raw_str
                    banchina_id = banchine_map.get(code_str)
            except:
                pass

            # Secondary Role
            raw_sec = row['secondo ruolo']
            sec_role = str(raw_sec).strip() if pd.notna(raw_sec) else None

            # Find Employee
            # Strategy 1: Exact Match (Case Insensitive)
            emp = db.query(Employee).filter(
                func.lower(Employee.first_name) == first_ex.lower(),
                func.lower(Employee.last_name) == last_ex.lower()
            ).first()
            
            # Strategy 2: "De Biase Andrea" -> "Andrea" "De Biase"
            if not emp:
                parts = first_ex.split()
                if len(parts) > 0:
                    real_first = parts[-1] 
                    real_last = last_ex + " " + " ".join(parts[:-1])
                    emp = db.query(Employee).filter(
                        func.lower(Employee.first_name) == real_first.lower(),
                        func.lower(Employee.last_name) == real_last.lower()
                    ).first()

            # Strategy 3: "Esposito Marroccella Francesco" -> "Francesco" "Esposito Marroccella"
            if not emp:
                 parts = first_ex.split()
                 if len(parts) > 0:
                     real_first = parts[-1]
                     real_last = last_ex + " " + " ".join(parts[:-1])
                     # Note: logic same as S2 but assumes Excel swapped fields differently. 
                     # Keeping logic consistent with original script intent.
                     emp = db.query(Employee).filter(
                        func.lower(Employee.first_name) == real_first.lower(),
                        func.lower(Employee.last_name) == real_last.lower()
                    ).first()

            if emp:
                # Update
                emp.default_banchina_id = banchina_id
                emp.secondary_role = sec_role
                
                # [NEW] Update Role, Department, Manager
                # Role
                raw_role = row.get('Macchine_ruoli') # or 'Ruolo Specifico'
                if pd.notna(raw_role):
                    emp.current_role = str(raw_role).strip()
                    
                # Department
                raw_dept = row.get('Reparto')
                if pd.notna(raw_dept):
                    dept_name = str(raw_dept).strip()
                    dept = db.query(Department).filter(func.lower(Department.name) == dept_name.lower()).first()
                    if dept:
                        emp.department_id = dept.id
                    else:
                        # Optional: Create department if missing? For now just log
                        # print(f"Dept not found: {dept_name}")
                        pass

                # Manager (Coordinatore)
                raw_coord = row.get('Coordinatore')
                if pd.notna(raw_coord):
                    coord_name = str(raw_coord).strip()
                    # Try to find coordinator employee
                    # Name is likely "Surname Name" or "Name Surname"
                    # We can use a simplified search or just skip if complex
                    # Let's try basic split search
                    c_parts = coord_name.split()
                    if len(c_parts) >= 2:
                        # Try "Name Surname"
                        manager = db.query(Employee).filter(
                            func.lower(Employee.first_name) == c_parts[0].lower(), 
                            func.lower(Employee.last_name) == " ".join(c_parts[1:]).lower()
                        ).first()
                        if not manager:
                             # Try "Surname Name"
                            manager = db.query(Employee).filter(
                                func.lower(Employee.last_name) == c_parts[0].lower(), 
                                func.lower(Employee.first_name) == " ".join(c_parts[1:]).lower()
                            ).first()
                        
                        if manager:
                            emp.manager_id = manager.id
                updates_count += 1
            else:
                print(f"[WARN] Employee not found in DB: {first_ex} {last_ex}")
                not_found_count += 1

        db.commit()
        print(f"\nSync Complete.")
        print(f"Updated: {updates_count}")
        print(f"Not Found: {not_found_count}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_data()
