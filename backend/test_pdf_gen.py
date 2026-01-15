
import sys
import os
import traceback
from datetime import datetime

# Add current directory to path
sys.path.append(os.getcwd())

try:
    print("Importing utils_pdf...")
    from utils_pdf import generate_shift_pdf
    print("Import successful.")
    
    print("Defining dummy data...")
    dept = "Test Dept"
    s_date = datetime(2026, 1, 12)
    e_date = datetime(2026, 1, 18)
    employees = [
        {
            "name": "Rossi Mario",
            "banchina": "B1",
            "shifts": ["06-14", "14-22", "22-06", "OFF", "FERIE", "MALATTIA", "PERMESSO"]
        }
    ]
    alerts = ["Test Alert 1", "Test Alert 2"]
    
    print("Generating PDF...")
    buffer = generate_shift_pdf(dept, s_date, e_date, employees, alerts)
    print("PDF Generated successfully.")
    print(f"Buffer size: {buffer.getbuffer().nbytes} bytes")

except Exception as e:
    print("CRASHED!")
    traceback.print_exc()
