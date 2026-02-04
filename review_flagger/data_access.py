import json
from typing import List, Optional, Tuple
from pathlib import Path
from .models import Rating, Course

# Load data once at module level for simplicity
DATA_PATH = Path(__file__).parent / "synthetic_data.json"

def _load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Synthetic data not found at {DATA_PATH}")
    with open(DATA_PATH, "r") as f:
        return json.load(f)

_DB = _load_data()

def get_user_history(username: str, limit: int = 20) -> List[Rating]:
    """Retrieve the last N ratings for a specific user."""
    all_ratings = [Rating(**r) for r in _DB.get("ratings", []) if r["username"] == username]
    # In a real DB, we would sort by date. Here we assume append order is chronological.
    return all_ratings[-limit:]

def get_course_stats(coursename: str, lecture_name: str) -> Tuple[float, int]:
    """Get the average rating and count for a specific course/lecture combination."""
    ratings = [
        r["score"] for r in _DB.get("ratings", []) 
        if r["coursename"] == coursename and r["lecture_name"] == lecture_name
    ]
    if not ratings:
        return 0.0, 0
    return sum(ratings) / len(ratings), len(ratings)

def get_context_summaries(coursename: str, lecture_name: str) -> Tuple[Optional[str], Optional[str]]:
    """Retrieve transcript and behavior summaries for a course/lecture."""
    for course in _DB.get("courses", []):
        if course["coursename"] == coursename and course["lecture_name"] == lecture_name:
            return course["transcript_summary"], course["behavior_summary"]
    return None, None

def get_user_meta(username: str):
    """Get user metadata like account age (mocked)."""
    for user in _DB.get("users", []):
        if user["username"] == username:
            return user
    return None
