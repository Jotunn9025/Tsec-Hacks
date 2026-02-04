from sqlalchemy import Column, Integer, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class WatchActivity(Base):
    __tablename__ = "watch_activity"

    id = Column(Integer, primary_key=True, index=True)
    course_access_id = Column(Integer, ForeignKey("course_access.id"), nullable=False)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    watch_time_minutes = Column(Float, default=0.0)
    completed = Column(Boolean, default=False)
    last_watched_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # Per-lecture fund tracking
    amount_locked_for_lecture = Column(Float, default=0.0)
    amount_spent_for_lecture = Column(Float, default=0.0)
    
    # Relationships
    course_access = relationship("CourseAccess", back_populates="watch_activities")
    lecture = relationship("Lecture")
