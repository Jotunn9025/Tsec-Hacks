from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from auth.dependencies import get_db, get_current_user, RoleChecker
from models.user import User
from models.student_profile import StudentProfile
from models.course import Course
from models.lecture import Lecture
from models.user_role import UserRole
from schemas.chunk import ChunkVisitIn, LectureChunksOut, ChunkActivityOut
from models.lecture_review import LectureReview
from schemas.review import ReviewCreate, ReviewOut
from models.lecture_chunk import LectureChunk
from models.student_chunk_activity import StudentChunkActivity
from schemas.course import CourseOut

router = APIRouter(
    prefix="/student",
    tags=["student"]
)

# Verify that the user has the instructor role
student_only = RoleChecker([UserRole.USER])

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

@router.get("/dashboard")
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns basic dashboard information for the student,
    including calculated watch stats from course_access and student_chunk_activity.
    """
    from models.course_access import CourseAccess
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    # Calculate total unique courses accessed
    total_courses_accessed = db.query(func.count(func.distinct(CourseAccess.course_id))).filter(
        CourseAccess.student_id == current_user.id
    ).scalar() or 0
    
    # Calculate total watch time from chunk activities
    # Each chunk represents 10 seconds of video
    total_chunks_visited = db.query(func.sum(StudentChunkActivity.visit_count)).filter(
        StudentChunkActivity.student_id == current_user.id
    ).scalar() or 0
    
    # Convert to minutes (each chunk is 10 seconds)
    total_watch_time_minutes = (total_chunks_visited * 10) / 60
    
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "total_courses_accessed": total_courses_accessed,
        "total_watch_time_minutes": round(total_watch_time_minutes, 1),
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
    courses = db.query(Course).filter(Course.active_yn == True).all()
    result = []
    for course in courses:
        avg_rating, review_count = get_course_rating_stats(course.id, db)
        # Use a dict to avoid Pydantic issues with extra fields if not correctly configured
        course_data = CourseOut.from_orm(course)
        course_dict = course_data.dict()
        course_dict["average_rating"] = avg_rating
        course_dict["review_count"] = review_count
        result.append(course_dict)
    return result

@router.get("/courses/{course_id}")
async def get_course_details(
    course_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns details of a specific course, including its list of lectures.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.active_yn == True).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    avg_rating, review_count = get_course_rating_stats(course.id, db)
    
    # The 'lectures' relationship exists on the Course model
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
        "lectures": [l for l in course.lectures if l.active_yn]
    }

@router.get("/lectures/{lecture_id}")
async def get_lecture_details(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns specific information about a lecture for viewing.
    Also records course access and calculates amount spent from paid chunks.
    """
    from models.course_access import CourseAccess, CourseAccessStatus
    
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.active_yn == True).first()
    if not lecture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecture not found"
        )
    
    # Create a NEW session-based CourseAccess record every time a lecture is opened
    # 1. Get last position from any previous session
    prev_session = db.query(CourseAccess).filter(
        CourseAccess.student_id == current_user.id,
        CourseAccess.course_id == lecture.course_id
    ).order_by(CourseAccess.id.desc()).first()
    
    last_pos = prev_session.last_position_seconds if prev_session else 0.0

    # 2. Add the new session entry
    access = CourseAccess(
        student_id=current_user.id,
        course_id=lecture.course_id,
        status=CourseAccessStatus.ACTIVE,
        total_amount_spent=0.0,
        last_position_seconds=last_pos
    )
    db.add(access)
    db.flush() # Get access.id
    
    # Reset session_visit_count for all chunks of this lecture for this student
    db.query(StudentChunkActivity).filter(
        StudentChunkActivity.student_id == current_user.id,
        StudentChunkActivity.lecture_chunk_id.in_(
            db.query(LectureChunk.id).filter(LectureChunk.lecture_id == lecture.id)
        )
    ).update({"session_visit_count": 0}, synchronize_session=False)

    # Calculate amount spent on this lecture from paid chunks
    paid_chunks = db.query(StudentChunkActivity).join(LectureChunk).filter(
        StudentChunkActivity.student_id == current_user.id,
        LectureChunk.lecture_id == lecture.id,
        StudentChunkActivity.is_paid == True
    ).all()
    
    amount_spent = sum(c.charged_amount for c in paid_chunks)
    
    # Increment view count
    lecture.view_count += 1
    
    db.commit()
    db.refresh(lecture)
    
    # Return lecture data
    return {
        "lecture": lecture,
        "amount_spent_for_lecture": amount_spent,
        "watch_time_seconds": access.last_position_seconds if access else 0.0
    }

@router.post("/chunk-visit", status_code=status.HTTP_200_OK)
async def report_chunk_visit(
    visit_in: ChunkVisitIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Increments the visit count for the chunk containing the provided timestamp.
    If it's the first visit to this chunk, charge the student based on lecture price.
    """
    from models.course_access import CourseAccess

    # Find which chunk the timestamp belongs to
    chunk = db.query(LectureChunk).filter(
        LectureChunk.lecture_id == visit_in.lecture_id,
        LectureChunk.start_time <= visit_in.timestamp,
        LectureChunk.end_time >= visit_in.timestamp
    ).first()

    if not chunk:
        # If timestamp is slightly beyond last chunk due to rounding, use the last one
        chunk = db.query(LectureChunk).filter(LectureChunk.lecture_id == visit_in.lecture_id).order_by(LectureChunk.index.desc()).first()
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")

    # Update or create student activity for this chunk
    activity = db.query(StudentChunkActivity).filter(
        StudentChunkActivity.student_id == current_user.id,
        StudentChunkActivity.lecture_chunk_id == chunk.id
    ).first()

    lecture = chunk.lecture
    charge_amount = 0.0
    is_recharge = False
    first_paid = False

    if not activity:
        # First visit ever: Charge
        chunk_duration = chunk.end_time - chunk.start_time
        charge_amount = (chunk_duration / 600.0) * lecture.price_per_10_mins
        
        activity = StudentChunkActivity(
            student_id=current_user.id,
            lecture_chunk_id=chunk.id,
            visit_count=1,
            session_visit_count=1,
            is_paid=True,
            charged_amount=charge_amount
        )
        db.add(activity)
        first_paid = True
    else:
        activity.visit_count += 1
        activity.session_visit_count += 1

        # Charging Logic:
        # 1. Not paid yet (edge case)
        # 2. Exceeded session revisit limit (3 total visits allowed: 1st + 2 free revisits)
        if not activity.is_paid or activity.session_visit_count > 3:
            chunk_duration = chunk.end_time - chunk.start_time
            charge_amount = (chunk_duration / 600.0) * lecture.price_per_10_mins
            
            if not activity.is_paid:
                activity.is_paid = True
                activity.charged_amount = charge_amount
            else:
                # This is a revisit charge
                activity.charged_amount += charge_amount
                activity.session_visit_count = 1 # Reset session count after recharge
                is_recharge = True
            
            first_paid = True

    # Update CourseAccess total spent and last position for the CURRENT session (the latest log entry)
    access = db.query(CourseAccess).filter(
        CourseAccess.student_id == current_user.id,
        CourseAccess.course_id == lecture.course_id
    ).order_by(CourseAccess.id.desc()).first()
    
    if access:
        if first_paid:
            access.total_amount_spent += charge_amount
        access.last_position_seconds = visit_in.timestamp

    db.commit()
    return {
        "status": "success", 
        "chunk_index": chunk.index, 
        "visit_count": activity.visit_count,
        "session_visit_count": activity.session_visit_count,
        "charged": first_paid,
        "charge_amount": charge_amount if first_paid else 0.0,
        "recharge": is_recharge
    }

@router.get("/lectures/{lecture_id}/chunks", response_model=LectureChunksOut)
async def get_lecture_chunks_activity(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all chunks for a lecture along with the current student's visit counts.
    """
    chunks = db.query(LectureChunk).filter(LectureChunk.lecture_id == lecture_id).order_by(LectureChunk.index).all()
    
    result_chunks = []
    for chunk in chunks:
        activity = db.query(StudentChunkActivity).filter(
            StudentChunkActivity.student_id == current_user.id,
            StudentChunkActivity.lecture_chunk_id == chunk.id
        ).first()
        
        result_chunks.append(ChunkActivityOut(
            index=chunk.index,
            start_time=chunk.start_time,
            end_time=chunk.end_time,
            visit_count=activity.visit_count if activity else 0
        ))
    
    return LectureChunksOut(lecture_id=lecture_id, chunks=result_chunks)

@router.get("/session-total/{course_id}")
async def get_session_total(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the total amount spent in the current session for a course.
    This fetches the total_amount_spent from the most recent course_access record.
    """
    from models.course_access import CourseAccess
    
    # Get the most recent session for this course
    access = db.query(CourseAccess).filter(
        CourseAccess.student_id == current_user.id,
        CourseAccess.course_id == course_id
    ).order_by(CourseAccess.id.desc()).first()
    
    if not access:
        return {"total_amount_spent": 0.0, "session_found": False}
    
    return {
        "total_amount_spent": access.total_amount_spent,
        "last_position_seconds": access.last_position_seconds,
        "session_found": True
    }

@router.post("/lectures/{lecture_id}/review", response_model=ReviewOut)
async def create_lecture_review(
    lecture_id: int,
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a review for a lecture.
    Uses flagger to detect and auto-hide suspicious reviews.
    """
    from flagger import flag_review
    
    # Verify lecture exists
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id, Lecture.active_yn == True).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    # Run the flagger to check for suspicious content (pass db session to avoid new connections)
    flag_result = flag_review(
        student_id=current_user.id,
        course_id=lecture.course_id,
        lecture_id=lecture_id,
        score=review_in.rating,
        review=review_in.review or "",
        db=db
    )
    
    # Create review with hidden flag based on flagger result
    new_review = LectureReview(
        student_id=current_user.id,
        lecture_id=lecture_id,
        rating=review_in.rating,
        review=review_in.review,
        hidden=flag_result.get("flagged", False)
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    # Log flagging reasons if any
    if flag_result.get("flagged"):
        print(f"Review {new_review.id} flagged: {flag_result.get('reasons')}")
    
    return new_review
@router.get("/lectures/{lecture_id}/reviews", response_model=List[ReviewOut])
async def get_lecture_reviews(
    lecture_id: int,
    db: Session = Depends(get_db)
):
    """
    Fetch all reviews for a specific lecture.
    """
    reviews = db.query(LectureReview).filter(
        LectureReview.lecture_id == lecture_id,
        LectureReview.hidden == False
    ).order_by(LectureReview.created_at.desc()).all()
    return reviews
