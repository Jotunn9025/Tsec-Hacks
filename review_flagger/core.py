from typing import List
import statistics
from .models import Rating, User

def calculate_deviation(score: float, course_avg: float) -> float:
    """Calculate how far the score is from the average."""
    return abs(score - course_avg)

def detect_spammer_behavior(history: List[Rating]) -> bool:
    """
    Detect if user shows spammer behavior.
    Heuristic: 
    1. If user has > 5 ratings and standard deviation is < 0.1 (meaning almost all same score).
    2. If user has > 5 ratings and all are 1.0 or 5.0.
    """
    if len(history) < 5:
        return False
    
    scores = [r.score for r in history]
    
    # Check for zero/low variance
    if len(set(scores)) == 1:
        return True
        
    try:
        stdev = statistics.stdev(scores)
        if stdev < 0.2:
            return True
    except statistics.StatisticsError:
        pass
    
    return False

def get_credibility_score(user_meta: dict, history: List[Rating]) -> float:
    """
    Calculate a credibility score between 0.0 and 1.0.
    Factors:
    - Account age (older is better)
    - Review count (more is better, up to a point)
    - Past Flagged Ratio (if history >= 5): Penalize if previous reviews were flagged.
    """
    if not user_meta:
        return 0.5 # Default for unknown users
        
    score = 0.5
    
    # Account Age Bonus
    age = user_meta.get("account_age_days", 0)
    if age > 365:
        score += 0.2
    elif age > 30:
        score += 0.1
        
    # Activity Bonus
    count = user_meta.get("total_reviews_count", 0)
    if count > 10:
        score += 0.1
        
    # History Check
    if len(history) >= 5:
        flagged_count = sum(1 for r in history if r.is_flagged)
        flagged_ratio = flagged_count / len(history)
        
        # Heavy penalty for bad history
        if flagged_ratio > 0.5:
            score -= 0.5
        elif flagged_ratio > 0.2:
            score -= 0.2
    else:
        # Check for immediate spammer behavior (low variance) even if new
        if detect_spammer_behavior(history):
            score -= 0.3
        
    return max(0.0, min(1.0, score))
