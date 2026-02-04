import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Configuration settings for the application
class Settings:
    # URL for the PostgreSQL database connection
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fastapi_db")
    # Secret key used for cryptographic signing (JWT)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret")
    # Algorithm used for JWT encoding/decoding
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    # Duration (in minutes) for which an access token is valid
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    # Duration (in days) for which a refresh token is valid
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
    # Cloudinary configuration
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET")

# Global settings instance to be used across the application
settings = Settings()
