from sqlalchemy import Column, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class StudentChunkActivity(Base):
    __tablename__ = "student_chunk_activity"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lecture_chunk_id = Column(Integer, ForeignKey("lecture_chunks.id"), nullable=False)
    visit_count = Column(Integer, default=0)
    session_visit_count = Column(Integer, default=0) # Resets on lecture load
    
    # Billing fields
    is_paid = Column(Boolean, default=False)
    charged_amount = Column(Float, default=0.0)

    # Relationships
    student = relationship("User")
    chunk = relationship("LectureChunk", back_populates="activities")
