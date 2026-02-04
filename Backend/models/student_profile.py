from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# Model extending User for those with the 'user' (student) role
class StudentProfile(Base):
    __tablename__ = "student_profiles"

    # Unique identifier for the profile
    id = Column(Integer, primary_key=True, index=True)
    # Reference to the base User record (one-to-one)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # Short biography or personal summary
    bio = Column(Text, nullable=True)
    # Learning goals or interests
    learning_goals = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
