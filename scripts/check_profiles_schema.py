import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

def check_profiles():
    if "instructor_profiles" in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('instructor_profiles')]
        print(f"Columns in 'instructor_profiles': {columns}")
    else:
        print("'instructor_profiles' table not found!")

if __name__ == "__main__":
    check_profiles()
