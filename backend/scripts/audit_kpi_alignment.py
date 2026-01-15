
import sqlite3
import os

DB_PATH = "sl_enterprise.db"

def audit_alignment():
    if not os.path.exists(DB_PATH):
        print("DB not found locally (expected for Docker env). Skipping local check.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("--- KPI ALIGNMENT AUDIT ---")
        
        # 1. Get all KpiConfigs (The Source of Truth)
        cursor.execute("SELECT sector_name FROM kpi_configs")
        kpi_configs = {row[0] for row in cursor.fetchall()}
        print(f"Found {len(kpi_configs)} active KPI Configs.")
        
        # 2. Get all ShiftRequirements with requires_kpi = 1
        cursor.execute("SELECT id, role_name, requires_kpi FROM shift_requirements")
        all_reqs = cursor.fetchall()
        
        reqs_flagged = {row[1] for row in all_reqs if row[2]} # role_name where requires_kpi=1
        reqs_all_names = {row[1]: row[0] for row in all_reqs} # role_name -> id
        
        # Check 1: Flagged in Postazioni but NOT in KpiConfig (Potential Chaos: New Configs created?)
        extra_flags = reqs_flagged - kpi_configs
        if extra_flags:
            print("\n[WARNING] Postazioni flagged 'requires_kpi' but NO existing KpiConfig found:")
            for name in extra_flags:
                print(f" - {name}")
                
        # Check 2: Exists in KpiConfig but NOT flagged in Postazioni (Inconsistent UI)
        missing_flags = kpi_configs - reqs_flagged
        # only verify if the role exists in shift_requirements at all
        missing_flags_existing_roles = [name for name in missing_flags if name in reqs_all_names]
        
        if missing_flags_existing_roles:
            print("\n[WARNING] Existing KpiConfigs NOT flagged in Postazioni:")
            for name in missing_flags_existing_roles:
                print(f" - {name} (ID: {reqs_all_names[name]})")
                
        if not extra_flags and not missing_flags_existing_roles:
            print("\n[SUCCESS] Perfect alignment! KPI flags match KpiConfigs exactly.")
        else:
            print("\n[ACTION REQUIRED] Data mismatch found.")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    audit_alignment()
