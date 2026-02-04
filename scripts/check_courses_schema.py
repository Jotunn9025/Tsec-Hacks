import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

def check_columns():
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
    
    if "courses" in tables:
        columns = [col['name'] for col in inspector.get_columns('courses')]
        print(f"Columns in 'courses': {columns}")
    else:
        print("'courses' table not found!")

if __name__ == "__main__":
    check_columns()
