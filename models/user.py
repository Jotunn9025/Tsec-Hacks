from sqlalchemy import Column, Integer, String, Boolean, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from database import Base
from .user_role import UserRole

# Represents a user entity in the database
class User(Base):
    __tablename__ = "users"

    # Unique identifier for the user
    id = Column(Integer, primary_key=True, index=True)
    # User's email address, must be unique
    email = Column(String, unique=True, index=True)
    # Hashed version of the user's password
    hashed_password = Column(String)
    # Whether the user account is active
    is_active = Column(Boolean, default=True)
    # The role assigned to the user (e.g., user, instructor, admin)
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.USER)
    # User's full name
    name = Column(String, nullable=True)
    # User's phone number
    phone_number = Column(String, nullable=True)

    # Relationship to the courses created by this user (if they are an instructor) - Deprecated in favor of profile
    # courses = relationship("Course", back_populates="instructor", cascade="all, delete-orphan")

    # One-to-one relationship with the InstructorProfile (only for instructors)
    instructor_profile = relationship("InstructorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    # One-to-one relationship with the StudentProfile (only for students/users)
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

#name, number, 
