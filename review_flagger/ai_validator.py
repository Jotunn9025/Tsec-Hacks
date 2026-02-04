import os
import json
try:
    from groq import Groq
except ImportError:
    Groq = None

class AIValidator:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            print("WARNING: GROQ_API_KEY not found. AI validation will fail or be skipped.")
        
        if Groq and api_key:
            self.client = Groq(api_key=api_key)
        else:
            self.client = None
            if not api_key:
                print("WARNING: GROQ_API_KEY not found. AI validation will be skipped.")
            elif not Groq:
                print("WARNING: 'groq' library not installed. AI validation disabled.")

    def validate_review_reason(
        self, 
        current_score: float, 
        user_reason: str, 
        transcript_summary: str, 
        behavior_summary: str
    ) -> dict:
        """
        Validates if the user's reason for the score makes sense given the context.
        Returns a dict with 'flagged': bool and 'reasoning': str.
        """
        if not self.client:
            return {"flagged": False, "reasoning": "AI Validation Skipped (No Client)"}

        prompt = f"""
        You are a Review Flagging Assistant. Your job is to determine if a student's review score is justified by their written reason, considering the actual course content and lecturer behavior.

        CONTEXT:
        Course Transcript Summary: {transcript_summary}
        Lecturer Behavior Summary: {behavior_summary}

        REVIEW TO VALIDATE:
        Score: {current_score}/5.0
        Student Reason: "{user_reason}"

        TASK:
        1. Does the reason reference something actually relevant to the course or lecturer?
        2. IF the score is extreme (1 or 5), does the reason provide a valid justification based on the context? (e.g., if they say "1/5 because aliens", but the transcript is about math, that's INVALID/HALLUCINATION).
        3. Is the reason vague spam (e.g., "bad", "good") without substance? (Vague is usually OK unless it contradicts facts).

        OUTPUT JSON ONLY:
        {{
            "flagged": true/false,
            "reasoning": "Short explanation of why it is flagged or not."
        }}
        """

        try:
            completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"},
            )
            response_content = completion.choices[0].message.content
            return json.loads(response_content)
        except Exception as e:
            return {"flagged": False, "reasoning": f"AI Validation Error: {str(e)}"}
