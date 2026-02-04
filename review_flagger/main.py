import argparse
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Ensure package structure works if run from outside
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from review_flagger.data_access import get_user_history, get_course_stats, get_context_summaries, get_user_meta
from review_flagger.core import calculate_deviation, detect_spammer_behavior, get_credibility_score
from review_flagger.ai_validator import AIValidator
from review_flagger.models import ReviewRequest

def main():
    parser = argparse.ArgumentParser(description="AI Review Flagger")
    parser.add_argument("--username", required=True, help="User submitting review")
    parser.add_argument("--course", required=True, help="Course name")
    parser.add_argument("--lecture", required=True, help="Lecture name (e.g., 'Neural Networks')")
    parser.add_argument("--score", type=float, required=True, help="Rating score 1.0-5.0")
    parser.add_argument("--reason", required=True, help="Reason for rating")
    
    args = parser.parse_args()
    
    print(f"--- Analyzing Review by {args.username} ---")
    
    # 1. Gather Data
    request = ReviewRequest(
        username=args.username,
        coursename=args.course,
        lecture_name=args.lecture,
        score=args.score,
        reason=args.reason
    )
    
    user_history = get_user_history(request.username)
    user_meta = get_user_meta(request.username)
    course_avg, course_count = get_course_stats(request.coursename, request.lecture_name)
    transcript_sum, behavior_sum = get_context_summaries(request.coursename, request.lecture_name)
    
    if not transcript_sum:
        print("Error: Course/Lecturer not found.")
        return

    # 2. Heuristic Analysis
    print("\n[Analytics Engine]")
    
    # Check Spammer behavior
    is_spammer = detect_spammer_behavior(user_history)
    print(f"Spammer Pattern Detected: {is_spammer}")
    
    # Credibility Score
    credibility = get_credibility_score(user_meta, user_history)
    print(f"User Credibility Score: {credibility:.2f}")
    
    # Deviation
    deviation = calculate_deviation(request.score, course_avg)
    print(f"Rating Deviation from Mean ({course_avg:.2f}): {deviation:.2f}")
    
    flagged_heuristics = False
    flagged_reasons = []
    
    if is_spammer:
        flagged_heuristics = True
        flagged_reasons.append("User history indicates spammer behavior (low variance).")
    
    # Credibility logic with Fallback
    if len(user_history) < 5:
        # Fallback for new users: Rely on Deviation
        if deviation > 2.0:
            flagged_heuristics = True
            flagged_reasons.append("High deviating score from new user (Fallback Rule).")
    else:
        # Standard logic for established users (Relies on Credibility Score which now accounts for is_flagged)
        if credibility < 0.4:
            flagged_heuristics = True
            flagged_reasons.append("User credibility is critically low based on past flagged history.")

        if deviation > 2.0 and credibility < 0.7:
            flagged_heuristics = True
            flagged_reasons.append("Significant deviation from consensus with low credibility.")

    # 3. AI Validation
    print("\n[AI Validator]")
    validator = AIValidator()
    ai_result = validator.validate_review_reason(
        request.score,
        request.reason,
        transcript_sum,
        behavior_sum
    )
    
    print(f"AI Check: {ai_result}")
    
    if ai_result.get("flagged"):
        flagged_reasons.append(f"AI Flag: {ai_result.get('reasoning')}")

    # 4. Final Verdict
    print("\n=== FINAL VERDICT ===")
    final_flag = flagged_heuristics or ai_result.get("flagged", False)
    
    if final_flag:
        print("🚩 REVIEW FLAGGED FOR REVIEW 🚩")
        print("Reasons:")
        for r in flagged_reasons:
            print(f"- {r}")
    else:
        print("✅ Review Passed Automated Checks")

if __name__ == "__main__":
    main()
