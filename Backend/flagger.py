import os
import json
import statistics
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from dotenv import load_dotenv
load_dotenv()

def flag_review(
    student_id: int, 
    course_id: int, 
    lecture_id: int, 
    score: int, 
    review: str,
    db: Session = None
) -> Dict[str, Any]:
    """
    Analyzes a review and returns flags if it appears suspicious.
    
    Args:
        student_id: ID of the student submitting the review.
        course_id: ID of the course.
        lecture_id: ID of the lecture.
        score: Rating score (1-5).
        review: Textual review content.
        db: SQLAlchemy database session (passed from the route).
        
    Returns:
        Dict containing 'flagged' (bool) and 'reasons' (list of strings).
    """
    transcript = None
    course_avg = 0.0
    user_history_scores = []
    
    # Use the passed db session if available, otherwise skip DB queries
    if db:
        try:
            # Transcript
            result = db.execute(text("SELECT transcript FROM lecture_transcripts WHERE lecture_id = :lid"), {"lid": lecture_id})
            transcript_row = result.fetchone()
            transcript = transcript_row[0] if transcript_row else None

            # Course Average Rating - need to get lecture_ids for this course first
            from models.lecture import Lecture
            from models.lecture_review import LectureReview
            
            lecture_ids = [l.id for l in db.query(Lecture.id).filter(Lecture.course_id == course_id).all()]
            if lecture_ids:
                avg_result = db.query(func.avg(LectureReview.rating)).filter(
                    LectureReview.lecture_id.in_(lecture_ids)
                ).scalar()
                course_avg = float(avg_result) if avg_result else 0.0

            # User History (Last 20 ratings for spammer detection)
            history = db.query(LectureReview.rating).filter(
                LectureReview.student_id == student_id
            ).order_by(LectureReview.created_at.desc()).limit(20).all()
            user_history_scores = [r[0] for r in history]
            
        except Exception as e:
            print(f"Flagger database error: {e}")
            # Continue with heuristics without DB data

    # 2. Heuristic Analysis
    flagged = False
    reasons = []

    # A. Spammer Detection (Low Variance)
    # Only checks if user has established history (> 5 reviews)
    if len(user_history_scores) >= 5:
        if len(set(user_history_scores)) == 1:
            flagged = True
            reasons.append("User history shows invariant ratings (spammer behavior).")
        else:
            try:
                stdev = statistics.stdev(user_history_scores)
                if stdev < 0.2:
                    flagged = True
                    reasons.append(f"User history has suspiciously low variance ({stdev:.2f}).")
            except statistics.StatisticsError:
                pass

    # B. Deviation Analysis
    # If new user (< 5 reviews) and high deviation from course average
    deviation = abs(score - course_avg)
    if len(user_history_scores) < 5 and course_avg > 0:
        if deviation > 2.0:
            flagged = True
            reasons.append(f"High deviation ({deviation:.2f}) from course average ({course_avg:.2f}) for new user.")

    # 3. AI Validation
    # Import Groq here to handle potential import errors or missing keys gracefully
    try:
        from groq import Groq
        api_key = os.environ.get("GROQ_API_KEY")
        
        if api_key and transcript:
            client = Groq(api_key=api_key)
            
            prompt = f"""
            You are a Review Flagging Assistant. Determine if a student's review score is justified by their written reason, considering the lecture transcript.

            CONTEXT:
            Lecture Transcript: "{transcript[:3000]}..." (truncated)

            REVIEW:
            Score: {score}/5
            Reason: "{review}"

            TASK:
            1. Does the reason reference something actually relevant to the lecture?
            2. If the score is extreme (1 or 5), is the reason a valid justification based on context?
            3. Is it vague spam?

            OUTPUT JSON ONLY:
            {{
                "flagged": true/false,
                "reasoning": "Short explanation."
            }}
            """
            
            completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"},
            )
            ai_result = json.loads(completion.choices[0].message.content)
            
            if ai_result.get("flagged"):
                flagged = True
                reasons.append(f"AI Flag: {ai_result.get('reasoning')}")

    except ImportError:
        pass # Groq not installed
    except Exception as e:
        # Don't fail the whole request if AI fails
        print(f"AI Validation error: {e}")

    return {
        "flagged": flagged,
        "reasons": reasons
    }

if __name__ == "__main__":
    # For standalone testing only
    print("Use this module with a db session from your route")