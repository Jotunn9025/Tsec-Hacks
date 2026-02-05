import os
import json
import statistics
import psycopg2
from typing import List, Optional, Dict, Any, Tuple
from dotenv import load_dotenv
load_dotenv()
def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(url)

def flag_review(student_id: int, course_id: int, lecture_id: int, score: int, review: str) -> Dict[str, Any]:
    """
    Analyzes a review and returns flags if it appears suspicious.
    
    Args:
        student_id: ID of the student submitting the review.
        course_id: ID of the course.
        lecture_id: ID of the lecture.
        score: Rating score (1-5).
        review: Textual review content.
        
    Returns:
        Dict containing 'flagged' (bool) and 'reasons' (list of strings).
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Fetch Data
        
        # Transcript
        cur.execute("SELECT transcript FROM lecture_transcripts WHERE lecture_id = %s", (lecture_id,))
        transcript_row = cur.fetchone()
        transcript = transcript_row[0] if transcript_row else None

        # Course Average Rating
        cur.execute("SELECT AVG(rating) FROM lecture_reviews WHERE course_id = %s", (course_id,))
        avg_row = cur.fetchone()
        course_avg = float(avg_row[0]) if avg_row and avg_row[0] is not None else 0.0

        # User History (Last 20 ratings for spammer detection)
        cur.execute("SELECT rating FROM lecture_reviews WHERE student_id = %s ORDER BY created_at DESC LIMIT 20", (student_id,))
        history_rows = cur.fetchall()
        user_history_scores = [row[0] for row in history_rows]

        # Recent Lecture Ratings (Last 5 for context - optional for AI but good for debugging/future)
        # cur.execute("SELECT rating, review FROM lecture_reviews WHERE lecture_id = %s ORDER BY created_at DESC LIMIT 5", (lecture_id,))
        # past_lecture_reviews = cur.fetchall()

        cur.close()
    except Exception as e:
        print(f"Database error: {e}")
        return {"flagged": False, "reasons": [f"Database error: {str(e)}"]}
    finally:
        if conn:
            conn.close()

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
        print(f"AI Validation Validation error: {e}")

    return {
        "flagged": flagged,
        "reasons": reasons
    }

if __name__ == "__main__":
    print(flag_review(13,7,9,2,"This lecture lacks substance"))