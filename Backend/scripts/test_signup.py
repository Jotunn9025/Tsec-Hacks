import requests
import json

URL = "http://127.0.0.1:8000/auth/signup"
DATA = {
    "email": "test_user_new@example.com",
    "password": "testpassword123",
    "name": "Test User",
    "phone_number": "1234567890",
    "role": "user"
}

try:
    response = requests.post(URL, json=DATA)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Connection Error: {e}")
