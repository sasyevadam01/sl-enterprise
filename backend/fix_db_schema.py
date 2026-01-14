import sqlite3

conn = sqlite3.connect("sl_enterprise.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE shift_requirements ADD COLUMN kpi_sector VARCHAR(100)")
    print("Column 'kpi_sector' added successfully.")
except Exception as e:
    print(f"Error adding column: {e}")

conn.commit()
conn.close()
