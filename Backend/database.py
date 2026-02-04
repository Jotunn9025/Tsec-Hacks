from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Database connection URL from settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create the SQLAlchemy engine for database interaction
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True,)
# Factory for creating database session instances
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for database models using the declarative system
Base = declarative_base()