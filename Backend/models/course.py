from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Represents a course entity in the database
class Course(Base):
    __tablename__ = "courses"

    # Unique identifier for the course
    id = Column(Integer, primary_key=True, index=True)
    # The title of the course
    title = Column(String, index=True, nullable=False)
    # A detailed description of the course content
    description = Column(Text, nullable=False)
    # The category the course belongs to (e.g., Programming, Business)
    category = Column(String, index=True, nullable=False)
    # URL to the course's thumbnail or cover image
    image_url = Column(String, nullable=True)
    # Total number of views across all lectures or for the course itself
    view_count = Column(Integer, default=0)
    # Whether this course is active and visible to students
    active_yn = Column(Boolean, default=True)
    # Foreign key referencing the InstructorProfile who created the course
    instructor_profile_id = Column(Integer, ForeignKey("instructor_profiles.id"), nullable=False)
    # Timestamp when the course was created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Timestamp when the course was last updated
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to the instructor (InstructorProfile)
    instructor_profile = relationship("InstructorProfile", back_populates="courses")
    # Relationship to the lectures contained within this course
    lectures = relationship("Lecture", back_populates="course", cascade="all, delete-orphan")
