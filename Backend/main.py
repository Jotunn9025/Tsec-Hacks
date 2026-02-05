# FastAPI application instance - Updated for Chunk Billing
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, Base
from auth.dependencies import get_db
from models.user import User # Import models to ensure they are registered with Base
from models.instructor_profile import InstructorProfile
from models.lecture import Lecture
from models.lecture_chunk import LectureChunk
from models.student_chunk_activity import StudentChunkActivity
from models.course_access import CourseAccess

from routes import auth, instructor, student, live_sessions

from fastapi.middleware.cors import CORSMiddleware


# Initialize the database and create tables if they do not exist
Base.metadata.create_all(bind=engine)


# FastAPI application instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the 'uploads' directory to serve static files (images, videos)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include authentication-related routes
app.include_router(auth.router)
# Include instructor-related routes
app.include_router(instructor.router)
# Include student-related routes
app.include_router(student.router)
# Include live sessions routes
app.include_router(live_sessions.router)

# Root endpoint for checking server health
@app.get("/")
async def root(db: Session = Depends(get_db)):
    return {"message": "FastAPI Backend Scaffold with PostgreSQL is running"}

@app.get("/debug/routes")
async def list_routes():
    return [{"path": r.path} for r in app.routes]