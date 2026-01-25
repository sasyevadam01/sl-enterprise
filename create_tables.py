import sys
import os
from sqlalchemy import create_engine
# Add current directory to path
sys.path.append(os.getcwd())

try:
    from backend.database import DATABASE_URL, Base
    # Make sure models are imported so they are registered in Base.metadata
    from backend.models import fleet 
except ImportError:
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from backend.database import DATABASE_URL, Base
    from backend.models import fleet

def create_tables():
    print(f"Connecting to DB: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    create_tables()
