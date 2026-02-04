import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables in database: {tables}")
    if 'student_profiles' in tables:
        columns = [col['name'] for col in inspector.get_columns('student_profiles')]
        print(f"Columns in 'student_profiles': {columns}")
    else:
        print("'student_profiles' table MISSING")
except Exception as e:
    print(f"An error occurred: {e}")
