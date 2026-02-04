# API Documentation

This document provides details for all available API endpoints in the Meanttor system.

## Authentication

### Sign Up
`POST /auth/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Full Name",
    "phone_number": "1234567890",
    "role": "user" // or "instructor"
  }
  ```
- **Response**: `UserOut` object.

### Login
`POST /auth/login`
- **Request Body**: Form Data (`username`, `password`)
- **Response**:
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer"
  }
  ```

### Refresh Token
`POST /auth/refresh`
- **Purpose**: Get a new access token when the current one expires.
- **Request Body**:
  ```json
  {
    "refresh_token": "..."
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer"
  }
  ```

---

## Instructor API
All endpoints require a Bearer token with **Instructor** role.

### Dashboard
`GET /instructor/`
- **Response**: Summary of instructor features and welcome message.

### Courses
- `POST /instructor/courses`: Create a new course.
- `GET /instructor/courses`: List all courses owned by the instructor.
- `GET /instructor/courses/{course_id}`: Get details of a specific course.
- `PUT /instructor/courses/{course_id}`: Update course details.
- `DELETE /instructor/courses/{course_id}`: Delete a course.

### Lectures
- `POST /instructor/courses/{course_id}/lectures`: Add a lecture to a course.
- `GET /instructor/courses/{course_id}/lectures`: List lectures in a course.
- `GET /instructor/courses/{course_id}/lectures/{lecture_id}`: Get specific lecture details.
- `PUT /instructor/courses/{course_id}/lectures/{lecture_id}`: Update lecture details.
- `DELETE /instructor/courses/{course_id}/lectures/{lecture_id}`: Delete a lecture.

---

## Student API
All endpoints require a Bearer token with **User** (Student) role.

### Dashboard
`GET /student/dashboard`
- **Response**: Student profile, email, and dashboard stats.

### Lecture Content
`GET /student/lectures/{lecture_id}`
- **Purpose**: Fetch lecture metadata and video URL.
- **Side Effect**: Automatically creates `CourseAccess` record and handles dynamic fund locking/resuming.
- **Response**:
  ```json
  {
    "lecture": {
      "id": 4,
      "title": "Introduction to React",
      "video_url": "https://res.cloudinary.com/dgw1i8qgp/video/upload/v123456789/lectures/shoes.mp4", // This is the Cloudinary URL
      "duration": 600,
      ...
    },
    "watch_time_seconds": 0.0,
    "is_completed": false
  }
  ```

### Watch Activity
`POST /student/watch-activity`
- **Purpose**: Track periodic progress and cumulative watch time.
- **Request Body**:
  ```json
  {
    "lecture_id": 1,
    "watch_time_increment_seconds": 30.0,
    "completed": false,
    "is_exit": false // Set to true on logout or when closing lecture
  }
  ```
- **Response**:
  ```json
  {
    "watch_time_seconds": 660.0,
    "completed": false,
    "amount_spent_for_lecture": 1.05,
    "amount_locked_for_lecture": 0,
    "released_amount": 0.95,
    "total_course_spent": 1.05,
    "total_course_locked": 0
  }
  ```

#### Response Parameter Descriptions:
- **`watch_time_seconds`**: Total cumulative seconds watched for this specific lecture. Use this as the `currentTime` to resume the video.
- **`completed`**: Boolean flag indicating if the lecture is fully finished.
- **`amount_spent_for_lecture`**: Total money permanently charged for this specific lecture so far.
- **`amount_locked_for_lecture`**: Funds currently reserved specifically for this lecture session.
- **`released_amount`**: The "Refund" amount. This tells you how much money was moved from the lecture's lock back to the student's main balance when `is_exit` is true.
- **`total_course_spent`**: The grand total spent on all lectures in this course so far.
- **`total_course_locked`**: Total funds currently tied up in active/unwatched reserved sessions for this course.
