from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# Represents an individual lecture within a course
class Lecture(Base):
    __tablename__ = "lectures"

    # Unique identifier for the lecture
    id = Column(Integer, primary_key=True, index=True)
    # Reference to the course this lecture belongs to
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    # Title of the lecture
    title = Column(String, index=True, nullable=False)
    # Detailed description of the lecture content
    description = Column(Text, nullable=True)
    # URL to the video content for this lecture
    video_url = Column(String, nullable=False)
    # Price for 10 minutes of coaching/access related to this lecture (optional/additional logic)
    price_per_10_mins = Column(Float, default=0.0)
    # Number of times this lecture has been viewed
    view_count = Column(Integer, default=0)
    # Duration of the lecture in seconds
    duration = Column(Integer, default=0)

    # Relationship back to the parent Course
    course = relationship("Course", back_populates="lectures")
