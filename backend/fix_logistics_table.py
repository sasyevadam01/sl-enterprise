from database import engine
from sqlalchemy import text

def fix_logistics_tables():
    columns_to_add = [
        ("logistics_material_types", "unit_of_measure", "VARCHAR(20) DEFAULT 'pz'"),
        ("logistics_requests", "unit_of_measure", "VARCHAR(20) DEFAULT 'pz'"),
        ("logistics_requests", "confirmation_code", "VARCHAR(10)"),
        ("logistics_requests", "require_otp", "BOOLEAN DEFAULT 0"),
    ]
    
    with engine.connect() as conn:
        for table, col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                print(f"Added column: {col_name} to table {table}")
            except Exception as e:
                print(f"Column {col_name} in table {table} might already exist: {e}")
        conn.commit()
    print("Migration finished!")

if __name__ == "__main__":
    fix_logistics_tables()
