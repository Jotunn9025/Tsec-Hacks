from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from models.user import User
from models.course import Course
from models.lecture import Lecture
from models.instructor_profile import InstructorProfile
from models.user_role import UserRole
from schemas.course import CourseCreate, CourseOut, CourseUpdate
from schemas.lecture import LectureCreate, LectureOut, LectureUpdate
from auth.dependencies import get_current_user, RoleChecker, get_db
from utils.cloudinary_utils import upload_image, upload_video

# Router for instructor-specific endpoints
router = APIRouter(prefix="/instructor", tags=["instructor"])

# Verify that the user has the instructor role
require_instructor = RoleChecker([UserRole.INSTRUCTOR])

# Base endpoint for the instructor dashboard
@router.get("/", response_model=dict)
def get_instructor_dashboard(current_user: User = Depends(require_instructor)):
    # Returns a welcome message and basic info for the instructor
    return {
        "message": f"Welcome to the Instructor Dashboard, {current_user.email}!",
        "role": current_user.role,
        "features": ["Course Management", "Student Analytics", "Assignments"]
    }

# --- Course CRUD Endpoints ---

# Endpoint to create a new course
@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve the instructor's profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Instructor profile not found")

    image_url = None
    if image:
        image_url = upload_image(image.file)

    # Create the course linked to the instructor's profile
    new_course = Course(
        title=title,
        description=description,
        category=category,
        image_url=image_url,
        instructor_profile_id=profile.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

# Endpoint to list all courses created by the current instructor
@router.get("/courses", response_model=List[CourseOut])
def list_instructor_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve the instructor's profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    if not profile:
        return []

    # Retrieve all courses where instructor_profile_id matches
    return db.query(Course).filter(Course.instructor_profile_id == profile.id).all()

# Endpoint to retrieve a specific course's details
@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve the instructor's profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find the course and verify it belongs to the current instructor's profile
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

# Endpoint to update an existing course
@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int, 
    course_in: CourseUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find the course and verify ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Update fields provided in the request
    update_data = course_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)
    
    db.commit()
    db.refresh(course)
    return course

# Endpoint to delete a course
@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find the course and verify ownership before deletion
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    return None

# --- Lecture CRUD Endpoints (Scoped to Course) ---

# Endpoint to add a lecture to a course
@router.post("/courses/{course_id}/lectures", response_model=LectureOut, status_code=status.HTTP_201_CREATED)
async def create_lecture(
    course_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    price_per_10_mins: float = Form(0.0),
    duration: int = Form(0),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify the course exists and belongs to this instructor
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Upload video to Cloudinary
    video_url = upload_video(video.file)

    # Create the new lecture
    new_lecture = Lecture(
        title=title,
        description=description,
        video_url=video_url,
        price_per_10_mins=price_per_10_mins,
        duration=duration,
        course_id=course_id
    )
    db.add(new_lecture)
    db.commit()
    db.refresh(new_lecture)
    return new_lecture

# Endpoint to list all lectures for a specific course
@router.get("/courses/{course_id}/lectures", response_model=List[LectureOut])
def list_course_lectures(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not profile or not course: # Added profile check here as well for consistency
        raise HTTPException(status_code=404, detail="Course not found")

    return course.lectures

# Endpoint to retrieve details of a specific lecture
@router.get("/courses/{course_id}/lectures/{lecture_id}", response_model=LectureOut)
def get_lecture(
    course_id: int,
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not profile or not course: # Added profile check here as well for consistency
        raise HTTPException(status_code=404, detail="Course not found")

    # Retrieve the lecture and verify it belongs to the course
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.course_id == course_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return lecture

# Endpoint to update a lecture's information
@router.put("/courses/{course_id}/lectures/{lecture_id}", response_model=LectureOut)
def update_lecture(
    course_id: int,
    lecture_id: int,
    lecture_in: LectureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not profile or not course: # Added profile check here as well for consistency
        raise HTTPException(status_code=404, detail="Course not found")

    # Find the lecture
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.course_id == course_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    # Update fields provided in the body
    update_data = lecture_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lecture, key, value)

    db.commit()
    db.refresh(lecture)
    return lecture

# Endpoint to delete a lecture
@router.delete("/courses/{course_id}/lectures/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecture(
    course_id: int,
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not profile or not course: # Added profile check here as well for consistency
        raise HTTPException(status_code=404, detail="Course not found")

    # Find and delete the lecture
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.course_id == course_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    db.delete(lecture)
    db.commit()
    return None