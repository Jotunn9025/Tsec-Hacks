from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from models.user import User
from models.course import Course
from models.lecture import Lecture
from models.instructor_profile import InstructorProfile
from models.user_role import UserRole
from schemas.course import CourseCreate, CourseOut, CourseUpdate
from schemas.lecture import LectureCreate, LectureOut, LectureUpdate
from auth.dependencies import get_current_user, RoleChecker, get_db
from utils.local_storage_utils import save_file_locally
from utils.chunk_utils import generate_lecture_chunks

# Router for instructor-specific endpoints
router = APIRouter(prefix="/instructor", tags=["instructor"])

# Verify that the user has the instructor role
require_instructor = RoleChecker([UserRole.INSTRUCTOR])

def get_course_rating_stats(course_id: int, db: Session):
    """
    Returns average rating and review count for a course based on its lectures.
    """
    from models.lecture import Lecture
    from models.lecture_review import LectureReview
    
    # Get all lecture IDs for this course
    lecture_ids = [l.id for l in db.query(Lecture.id).filter(Lecture.course_id == course_id).all()]
    
    if not lecture_ids:
        return 0.0, 0
    
    stats = db.query(
        func.avg(LectureReview.rating),
        func.count(LectureReview.id)
    ).filter(LectureReview.lecture_id.in_(lecture_ids)).first()
    
    return float(stats[0] if stats[0] else 0.0), int(stats[1] if stats[1] else 0)

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
        image_url = save_file_locally(image, "courses")

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

    courses = db.query(Course).filter(Course.instructor_profile_id == profile.id).all()
    result = []
    for course in courses:
        avg_rating, review_count = get_course_rating_stats(course.id, db)
        course_data = CourseOut.from_orm(course)
        course_dict = course_data.dict()
        course_dict["average_rating"] = avg_rating
        course_dict["review_count"] = review_count
        result.append(course_dict)
    return result

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
        raise HTTPException(status_code=404, detail="Instructor profile not found")

    # Find the course and verify ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    avg_rating, review_count = get_course_rating_stats(course.id, db)
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "image_url": course.image_url,
        "view_count": course.view_count,
        "instructor_profile_id": course.instructor_profile_id,
        "average_rating": avg_rating,
        "review_count": review_count,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "lectures": course.lectures
    }

# Endpoint to update an existing course (with optional image upload)
@router.put("/courses/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int, 
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
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
    if title is not None:
        course.title = title
    if description is not None:
        course.description = description
    if category is not None:
        course.category = category
    
    # Handle new image upload
    if image:
        image_url = save_file_locally(image, "courses")
        course.image_url = image_url
    
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

@router.get("/lectures/{lecture_id}/reviews", response_model=List[dict])
def get_lecture_reviews_instructor(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    """
    Fetch all reviews for a specific lecture (for instructors).
    """
    from models.lecture_review import LectureReview
    reviews = db.query(LectureReview).filter(
        LectureReview.lecture_id == lecture_id
    ).order_by(LectureReview.created_at.desc()).all()
    
    # Return list of reviews
    return reviews

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

    # Upload video to local storage
    video_url = save_file_locally(video, "lectures")

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

    # Generate chunks for the new lecture
    if new_lecture.duration > 0:
        generate_lecture_chunks(db, new_lecture.id, new_lecture.duration)

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

# Endpoint to update a lecture's information (with optional video upload)
@router.put("/courses/{course_id}/lectures/{lecture_id}", response_model=LectureOut)
async def update_lecture(
    course_id: int,
    lecture_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    duration: Optional[int] = Form(None),
    price_per_10_mins: Optional[float] = Form(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Retrieve instructor profile
    profile = db.query(InstructorProfile).filter(InstructorProfile.user_id == current_user.id).first()
    # Verify course ownership
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_profile_id == profile.id).first()
    if not profile or not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find the lecture
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.course_id == course_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    # Update fields provided in the request
    duration_updated = False
    if title is not None:
        lecture.title = title
    if description is not None:
        lecture.description = description
    if duration is not None:
        lecture.duration = duration
        duration_updated = True
    if price_per_10_mins is not None:
        lecture.price_per_10_mins = price_per_10_mins
    
    # Handle new video upload
    if video:
        video_url = save_file_locally(video, "lectures")
        lecture.video_url = video_url

    # If duration was updated, regenerate chunks
    if duration_updated:
        generate_lecture_chunks(db, lecture.id, lecture.duration)

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