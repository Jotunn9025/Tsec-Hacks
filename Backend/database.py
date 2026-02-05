from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Database connection URL from settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create the SQLAlchemy engine for database interaction
# Increased pool size and added recycling to prevent connection exhaustion
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,  # Recycle connections after 5 minutes
)
# Factory for creating database session instances
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for database models using the declarative system
Base = declarative_base()