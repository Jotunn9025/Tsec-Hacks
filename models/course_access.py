from sqlalchemy import Column, Integer, Float, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from database import Base
import enum

class CourseAccessStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

class CourseAccess(Base):
    __tablename__ = "course_access"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    amount_locked = Column(Float, default=0.0)
    total_watch_time_minutes = Column(Float, default=0.0)
    total_amount_spent = Column(Float, default=0.0)
    status = Column(SQLAlchemyEnum(CourseAccessStatus), default=CourseAccessStatus.ACTIVE)

    # Relationships
    student = relationship("User")
    course = relationship("Course")
    watch_activities = relationship("WatchActivity", back_populates="course_access", cascade="all, delete-orphan")
