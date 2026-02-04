from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from auth.dependencies import get_db, get_current_user, RoleChecker
from models.user import User
from models.student_profile import StudentProfile
from models.course import Course
from models.lecture import Lecture
from models.user_role import UserRole
from schemas.watch_activity import WatchActivityUpdate

router = APIRouter(
    prefix="/student",
    tags=["student"]
)

# Access control: Only users with 'user' (student) role can access these endpoints
student_only = RoleChecker([UserRole.USER])

@router.get("/dashboard")
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns basic dashboard information for the student.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    return {
        "user_email": current_user.email,
        "role": current_user.role,
        "profile": {
            "bio": profile.bio if profile else None,
            "learning_goals": profile.learning_goals if profile else None
        } if profile else None,
        "message": "Welcome to your student dashboard"
    }

@router.get("/courses")
async def get_all_courses(
    db: Session = Depends(get_db)
):
    """
    Returns a list of all courses available from all instructors.
    """
    courses = db.query(Course).all()
    return courses

@router.get("/courses/{course_id}")
async def get_course_details(
    course_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns details of a specific course, including its list of lectures.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # The 'lectures' relationship exists on the Course model
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "image_url": course.image_url,
        "view_count": course.view_count,
        "instructor_profile_id": course.instructor_profile_id,
        "lectures": course.lectures
    }

@router.get("/lectures/{lecture_id}")
async def get_lecture_details(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns specific information about a lecture for viewing.
    Also records course access, adds a per-lecture watch activity, and locks funds.
    """
    from models.course_access import CourseAccess, CourseAccessStatus
    from models.watch_activity import WatchActivity
    
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecture not found"
        )
    
    # Check/Create CourseAccess record
    access = db.query(CourseAccess).filter(
        CourseAccess.student_id == current_user.id,
        CourseAccess.course_id == lecture.course_id
    ).first()
    
    if not access:
        access = CourseAccess(
            student_id=current_user.id,
            course_id=lecture.course_id,
            status=CourseAccessStatus.ACTIVE
        )
        db.add(access)
        db.flush() # Get access.id
    
    # Check/Create WatchActivity for this lecture
    activity = db.query(WatchActivity).filter(
        WatchActivity.course_access_id == access.id,
        WatchActivity.lecture_id == lecture.id
    ).first()

    # Total possible price for this lecture
    full_price = (lecture.duration / 600.0) * lecture.price_per_10_mins

    if not activity:
        # First time opening: lock full price
        activity = WatchActivity(
            course_access_id=access.id,
            lecture_id=lecture.id,
            amount_locked_for_lecture=full_price
        )
        db.add(activity)
        access.amount_locked += full_price
    elif not activity.completed and activity.amount_locked_for_lecture == 0:
        # Resuming after a "Release": calculate and re-lock the remaining portion
        remaining_to_lock = full_price - activity.amount_spent_for_lecture
        if remaining_to_lock > 0:
            activity.amount_locked_for_lecture = remaining_to_lock
            access.amount_locked += remaining_to_lock
    
    # Increment view count
    lecture.view_count += 1
    
    db.commit()
    db.refresh(lecture)
    
    # Return lecture data plus user's specific progress for resuming
    return {
        "lecture": lecture,
        "watch_time_seconds": (activity.watch_time_minutes * 60.0) if activity else 0.0,
        "is_completed": activity.completed if activity else False
    }

@router.post("/watch-activity")
async def update_watch_activity(
    update_in: WatchActivityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the watch activity for a specific lecture and handles charging.
    If is_exit is True, remaining locked funds for this lecture are released.
    """
    from models.course_access import CourseAccess
    from models.watch_activity import WatchActivity
    from models.lecture import Lecture

    # Find the lecture
    lecture = db.query(Lecture).filter(Lecture.id == update_in.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    # Find the course access record
    access = db.query(CourseAccess).filter(
        CourseAccess.student_id == current_user.id,
        CourseAccess.course_id == lecture.course_id
    ).first()

    if not access:
        raise HTTPException(status_code=403, detail="No active access to this course")

    # Find the WatchActivity record
    activity = db.query(WatchActivity).filter(
        WatchActivity.course_access_id == access.id,
        WatchActivity.lecture_id == lecture.id
    ).first()

    if not activity:
        raise HTTPException(status_code=400, detail="Watch activity not started for this lecture")

    # Update watch time (DB stores minutes, input is seconds)
    increment_minutes = update_in.watch_time_increment_seconds / 60.0
    activity.watch_time_minutes += increment_minutes
    access.total_watch_time_minutes += increment_minutes

    # --- Charging Logic ---
    if update_in.completed and not activity.completed:
        # If just completed, charge all remaining locked funds for this lecture
        remaining_lock = activity.amount_locked_for_lecture
        if remaining_lock > 0:
            activity.amount_spent_for_lecture += remaining_lock
            activity.amount_locked_for_lecture = 0
            access.total_amount_spent += remaining_lock
            access.amount_locked -= remaining_lock
        activity.completed = True
    elif not activity.completed:
        # Calculate charge for the increment (price is per 10 mins = 600 seconds)
        charge_increment = (update_in.watch_time_increment_seconds / 600.0) * lecture.price_per_10_mins
        
        # Ensure we don't charge more than what was locked
        charge_to_apply = min(charge_increment, activity.amount_locked_for_lecture)
        
        if charge_to_apply > 0:
            activity.amount_spent_for_lecture += charge_to_apply
            activity.amount_locked_for_lecture -= charge_to_apply
            access.total_amount_spent += charge_to_apply
            access.amount_locked -= charge_to_apply

    # --- Release Logic (on Exit/Logout) ---
    released_amount = 0.0
    if update_in.is_exit and not activity.completed:
        # Release any remaining locked funds for this specific lecture back to "unlocked"
        released_amount = activity.amount_locked_for_lecture
        if released_amount > 0:
            access.amount_locked -= released_amount
            activity.amount_locked_for_lecture = 0

    db.commit()
    db.refresh(activity)

    return {
        "watch_time_seconds": (activity.watch_time_minutes * 60.0),
        "completed": activity.completed,
        "amount_spent_for_lecture": activity.amount_spent_for_lecture,
        "amount_locked_for_lecture": activity.amount_locked_for_lecture,
        "released_amount": released_amount,
        "total_course_spent": access.total_amount_spent,
        "total_course_locked": access.amount_locked
    }
