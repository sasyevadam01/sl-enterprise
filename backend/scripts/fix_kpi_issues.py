"""
Script per correggere i dati KPI usando SQL diretto.
1. Rimuove "Servizi Generali" dalla tabella kpi_configs
2. Aggiunge "Fasciatrice Sfoderabile" alla tabella kpi_configs

Usa SQL puro per evitare problemi con i mapper ORM.
"""
import sqlite3
import os

# Determina il path del database
db_path = os.getenv("DATABASE_PATH", "./sl_enterprise.db")
print(f"--> Connecting to: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--> Starting KPI Config Data Fix...")

# 1. DELETE "Servizi Generali" from kpi_configs
try:
    cursor.execute("SELECT id, sector_name FROM kpi_configs WHERE sector_name LIKE '%Servizi Generali%'")
    rows = cursor.fetchall()
    
    if rows:
        for row in rows:
            print(f"   Deleting: {row[1]} (ID {row[0]})")
        
        cursor.execute("DELETE FROM kpi_configs WHERE sector_name LIKE '%Servizi Generali%'")
        conn.commit()
        print(f"   SUCCESS: Deleted {len(rows)} 'Servizi Generali' config(s).")
    else:
        print("   INFO: No 'Servizi Generali' found to delete.")
except Exception as e:
    print(f"   ERROR deleting Servizi Generali: {e}")

# 2. ADD "Fasciatrice Sfoderabile" to kpi_configs
try:
    cursor.execute("SELECT id FROM kpi_configs WHERE sector_name = 'Fasciatrice Sfoderabile'")
    existing = cursor.fetchone()
    
    if not existing:
        print("   Creating 'Fasciatrice Sfoderabile' KPI config...")
        cursor.execute("""
            INSERT INTO kpi_configs (sector_name, kpi_target_8h, kpi_target_hourly, is_active, display_order)
            VALUES ('Fasciatrice Sfoderabile', 400, 50.0, 1, 50)
        """)
        conn.commit()
        print("   SUCCESS: Created 'Fasciatrice Sfoderabile'.")
    else:
        print(f"   INFO: 'Fasciatrice Sfoderabile' already exists (ID {existing[0]}).")
except Exception as e:
    print(f"   ERROR creating Fasciatrice: {e}")

conn.close()
print("--> Done.")
