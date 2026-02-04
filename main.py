from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, Base
from auth.dependencies import get_db
from models.user import User # Import models to ensure they are registered with Base
from models.instructor_profile import InstructorProfile
from models.lecture import Lecture

from routes import auth, instructor, student

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

# Include authentication-related routes
app.include_router(auth.router)
# Include instructor-related routes
app.include_router(instructor.router)
# Include student-related routes
app.include_router(student.router)

# Root endpoint for checking server health
@app.get("/")
async def root(db: Session = Depends(get_db)):
    return {"message": "FastAPI Backend Scaffold with PostgreSQL is running"}