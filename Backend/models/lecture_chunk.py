from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class LectureChunk(Base):
    __tablename__ = "lecture_chunks"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    index = Column(Integer, nullable=False)  # Zero-based index of the chunk
    start_time = Column(Float, nullable=False) # Start in seconds
    end_time = Column(Float, nullable=False)   # End in seconds

    # Relationships
    lecture = relationship("Lecture", back_populates="chunks")
    activities = relationship("StudentChunkActivity", back_populates="chunk", cascade="all, delete-orphan")
