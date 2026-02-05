import unittest
from unittest.mock import MagicMock, patch
import os
import sys
from unittest.mock import MagicMock, patch

# Ensure we can import review_flagger
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from review_flagger.flagger import flag_review

class TestReviewFlagger(unittest.TestCase):
    @patch('review_flagger.flagger.psycopg2.connect')
    @patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"})
    def test_flag_review_deviation(self, mock_connect):
        # Setup Mock DB
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Mock DB Scenarios
        # 1. Transcript
        # 2. Course Average
        # 3. User History (for Spammer check)
        
        # Scenario: New user (history < 5), High Deviation
        # Transcript
        transcript_return = ("This lecture covers basics of neural networks...",)
        
        # Course Avg (e.g., 4.5)
        avg_return = (4.5,)
        
        # User History (e.g., 2 ratings, not enough for spammer check)
        history_return = [(5,), (4,)] 
        
        # Ordering of side_effects for fetchone/fetchall calls
        # 1. fetchone (transcript)
        # 2. fetchone (course avg)
        # 3. fetchall (user history)
        mock_cursor.fetchone.side_effect = [transcript_return, avg_return]
        mock_cursor.fetchall.side_effect = [history_return]

        # Call Function
        # Review: Score 1.0 (Deviation 3.5), Reason "Bad"
        result = flag_review(student_id=1, course_id=101, lecture_id=505, score=1, review="Bad")

        # Verify
        self.assertTrue(result['flagged'])
        self.assertTrue(any("High deviation" in r for r in result['reasons']))
        print("Test Deviation: Passed", result)


    @patch('review_flagger.flagger.psycopg2.connect')
    @patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"})
    def test_flag_review_spammer(self, mock_connect):
        # Setup Mock DB
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Spammer Scenario: > 5 ratings, zero variance
        mock_cursor.fetchone.side_effect = [
            ("Transcript content...",), # Transcript
            (3.0,) # Course Avg
        ]
        
        # History: 10 ratings of 1.0
        spammer_history = [(1.0,)] * 10
        mock_cursor.fetchall.side_effect = [spammer_history]

        # Call Function
        result = flag_review(student_id=2, course_id=101, lecture_id=505, score=1, review="Bad")

        # Verify
        self.assertTrue(result['flagged'])
        self.assertTrue(any("invariant ratings" in r for r in result['reasons']))
        print("Test Spammer: Passed", result)

if __name__ == '__main__':
    unittest.main()
