import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, Employee, User
from passlib.context import CryptContext

# Configuration
EXCEL_FILE = "Database_Aggiornato.xlsx"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db") # Fallback for local testing

# Setup DB Connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def import_employees():
    if not os.path.exists(EXCEL_FILE):
        print(f"❌ Error: {EXCEL_FILE} not found!")
        return

    print(f"📂 Reading {EXCEL_FILE}...")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except Exception as e:
        print(f"❌ Failed to read Excel: {e}")
        return

    count_new = 0
    count_skip = 0

    print("🚀 Starting import...")

    for index, row in df.iterrows():
        try:
            # Extract Name (Assuming format "Surname Name" or split columns)
            # Adjust based on your actual Excel columns
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
                    first_name = ""
            else:
                # Fallback to column index 0 and 1 if headers are missing/different
                # This is a guess, adjust if needed
                first_name = str(row.iloc[0]).strip() 
                last_name = str(row.iloc[1]).strip()

            if not first_name or not last_name or first_name == 'nan' or last_name == 'nan':
                continue

            # Check if exists
            existing = db.query(Employee).filter(
                Employee.first_name == first_name, 
                Employee.last_name == last_name
            ).first()

            if existing:
                count_skip += 1
                continue

            # Create Employee
            new_emp = Employee(
                first_name=first_name,
                last_name=last_name,
                email=f"{first_name.lower()}.{last_name.lower()}@example.com".replace(" ", ""), # Mock email
                fiscal_code=f"GENERIC{index}", # Placeholder
                department="Produzione", # Default
                job_title="Operaio", # Default
                is_active=True
            )
            db.add(new_emp)
            count_new += 1
            
        except Exception as e:
            print(f"⚠️ Error importing row {index}: {e}")

    db.commit()
    print(f"✅ Import Finished!")
    print(f"   ➕ Added: {count_new}")
    print(f"   ⏭️ Skipped: {count_skip}")
    db.close()

if __name__ == "__main__":
    import_employees()
