from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load env to get correct DB path
load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "sl_enterprise.db")
DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(DATABASE_URL)

def run_migrations():
    print(f"Starting Database Migration on: {db_path}")
    
    # List of changes: (Table, Column, Type/Default)
    columns_to_ensure = [
        # LOGISTICS
        ("logistics_material_types", "unit_of_measure", "VARCHAR(20) DEFAULT 'pz'"),
        ("logistics_material_types", "base_points", "INTEGER DEFAULT 0"),
        ("logistics_requests", "unit_of_measure", "VARCHAR(20) DEFAULT 'pz'"),
        ("logistics_requests", "confirmation_code", "VARCHAR(10)"),
        ("logistics_requests", "require_otp", "BOOLEAN DEFAULT 0"),
        ("logistics_requests", "was_released", "BOOLEAN DEFAULT 0"),
        ("logistics_requests", "prepared_by_id", "INTEGER REFERENCES users(id)"),
        ("logistics_requests", "prepared_at", "DATETIME"),
        
        # FLEET CHECKLISTS
        ("fleet_checklists", "tablet_photo_url", "VARCHAR(500)"),
        ("fleet_checklists", "tablet_status", "VARCHAR(50) DEFAULT 'unknown'"),
        ("fleet_checklists", "shift", "VARCHAR(50)"),

        # USERS (Location Tracking)
        ("users", "last_lat", "FLOAT"),
        ("users", "last_lon", "FLOAT"),
        ("users", "last_location_update", "DATETIME"),

        # USERS (PIN Authentication)
        ("users", "pin_hash", "VARCHAR"),
        ("users", "pin_required", "BOOLEAN DEFAULT 1"),
        
        # FLEET CHARGE (Miglioramenti Takeover/Statistiche)
        ("fleet_charge_cycles", "forgot_return", "BOOLEAN DEFAULT 0"),
        ("fleet_charge_cycles", "forced_return_by", "INTEGER REFERENCES employees(id)"),
        
        # FLEET VEHICLES (Blocco temporaneo sicurezza)
        ("fleet_vehicles", "is_blocked", "BOOLEAN DEFAULT 0"),
        ("fleet_vehicles", "block_info", "JSON"),
        
        # OTHERS (Add here if needed)
    ]
    
    with engine.connect() as conn:
        for table, col_name, col_type in columns_to_ensure:
            try:
                # Check if column exists
                # SQLite doesn't have "IF NOT EXISTS" for columns easily, so we try adding it.
                # If it fails, it usually means it exists.
                print(f"Checking {table}.{col_name}...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                print(f"[OK] Added {col_name} to {table}")
            except Exception as e:
                # Catch "duplicate column name" error
                if "duplicate column name" in str(e).lower():
                    print(f"[INFO] {col_name} already exists in {table} (OK)")
                else:
                    print(f"[ERROR] on {table}.{col_name}: {e}")
        
        conn.commit()
    
    # Post-migration data fixes
    print("\nApplying data fixes...")
    with engine.connect() as conn:
        try:
            # Ensure ALL users have pin_required = 1 (true) by default
            result = conn.execute(text("UPDATE users SET pin_required = 1 WHERE pin_required = 0 OR pin_required IS NULL"))
            print(f"[FIX] Set pin_required=1 for {result.rowcount} users")
            conn.commit()
        except Exception as e:
            print(f"[WARN] pin_required fix: {e}")
    
    print("\nMigration Completed! Database is ready for new code.")

if __name__ == "__main__":
    run_migrations()
