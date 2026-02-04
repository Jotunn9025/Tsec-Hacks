import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from routes.auth import signup
from schemas.user import UserCreate
from models.user_role import UserRole

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

user_in = UserCreate(
    email="test_script_error@example.com",
    password="password123",
    name="Script Test",
    phone_number="1234567890",
    role=UserRole.USER
)

try:
    print("Attempting signup...")
    result = signup(user_in, db)
    print("Signup successful")
    db.commit()
except Exception as e:
    import traceback
    print("Signup failed!")
    traceback.print_exc()
finally:
    db.close()
