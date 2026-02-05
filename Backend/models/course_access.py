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
    total_amount_spent = Column(Float, default=0.0)
    last_position_seconds = Column(Float, default=0.0) # For resuming
    status = Column(SQLAlchemyEnum(CourseAccessStatus), default=CourseAccessStatus.ACTIVE)

    # Relationships
    student = relationship("User")
    course = relationship("Course")
