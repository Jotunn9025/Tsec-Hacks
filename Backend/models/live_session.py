from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, Enum as SQLAlchemyEnum, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class LiveSessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELLED = "cancelled"

class LiveSession(Base):
    __tablename__ = "live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    status = Column(SQLAlchemyEnum(LiveSessionStatus), default=LiveSessionStatus.SCHEDULED)
    price = Column(Float, default=0.0)
    max_participants = Column(Integer, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    agora_channel = Column(String(100), nullable=True)  # Agora channel name
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    instructor = relationship("User")
    registrations = relationship("SessionRegistration", back_populates="session")


class SessionRegistration(Base):
    __tablename__ = "session_registrations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("live_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    paid_amount = Column(Float, default=0.0)
    registered_at = Column(DateTime, default=datetime.utcnow)
    attended = Column(Boolean, default=False)

    # Relationships
    session = relationship("LiveSession", back_populates="registrations")
    student = relationship("User")
