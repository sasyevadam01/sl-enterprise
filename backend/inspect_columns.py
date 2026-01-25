from database import engine
from sqlalchemy import text, inspect

def check_columns():
    inspector = inspect(engine)
    columns = inspector.get_columns('logistics_requests')
    print("Columns in logistics_requests:")
    for c in columns:
        print(f"- {c['name']} ({c['type']})")

if __name__ == "__main__":
    check_columns()
