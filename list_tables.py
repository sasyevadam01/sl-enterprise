import sys
import os
from sqlalchemy import create_engine, inspect

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from backend.database import DATABASE_URL
except ImportError:
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from backend.database import DATABASE_URL

def list_tables():
    print(f"Connecting to DB: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables found:", tables)

if __name__ == "__main__":
    list_tables()
