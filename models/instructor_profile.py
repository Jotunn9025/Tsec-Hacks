from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# Model extending User for those with the 'instructor' role
class InstructorProfile(Base):
    __tablename__ = "instructor_profiles"

    # Unique identifier for the profile
    id = Column(Integer, primary_key=True, index=True)
    # Reference to the base User record (one-to-one)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # Short biography or professional summary
    bio = Column(Text, nullable=True)
    # Average rating given by students
    rating_avg = Column(Float, default=0.0)
    # Sum of all earnings from course sales
    total_earnings = Column(Float, default=0.0)

    # Relationships
    user = relationship("User", back_populates="instructor_profile")
    courses = relationship("Course", back_populates="instructor_profile", cascade="all, delete-orphan")
