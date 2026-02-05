// API Service Layer - Centralized API client with authentication

const API_BASE = 'https://sequestrable-elsie-knurliest.ngrok-free.dev';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface User {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  role: 'user' | 'instructor';
  wallet_balance: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  image_url?: string;
  instructor_id: number;
  created_at: string;
}

export interface Lecture {
  id: number;
  title: string;
  description: string;
  video_url: string;
  duration: number; // Duration in seconds
  price_per_10_mins: number;
  course_id: number;
  order_index?: number;
  created_at: string;
}

export interface LectureWithProgress extends Lecture {
  progress?: number;
  completed?: boolean;
}

export interface CourseWithLectures extends Course {
  lectures: LectureWithProgress[];
}

export interface WatchActivityRequest {
  lecture_id: number;
  watch_time_increment_minutes: number;
  completed: boolean;
  is_exit?: boolean;
}


export interface WatchActivityResponse {
  watch_time_minutes: number;
  completed: boolean;
  amount_spent_for_lecture: number;
  amount_locked_for_lecture: number;
  released_amount: number;
  total_course_spent: number;
  total_course_locked: number;
  lecture_progress?: number; // Optional as not in the new sample but might still be used? keeping just in case or removing if sure. User sample didn't have it.
  course_progress?: number;
}

export interface StudentDashboard {
  email: string;
  name: string;
  wallet_balance: number;
  total_courses_accessed?: number;
  total_watch_time_minutes?: number;
}

// ============================================
// API CLIENT
// ============================================

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    return this.handleResponse(response);
  }

  async signup(data: {
    email: string;
    password: string;
    name: string;
    phone_number: string;
    role: 'user' | 'instructor';
  }): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // ============================================
  // STUDENT API
  // ============================================

  async getStudentDashboard(): Promise<StudentDashboard> {
    const response = await fetch(`${API_BASE}/student/dashboard`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStudentCourses(): Promise<Course[]> {
    const response = await fetch(`${API_BASE}/student/courses`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStudentCourse(courseId: number): Promise<CourseWithLectures> {
    const response = await fetch(`${API_BASE}/student/courses/${courseId}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStudentLecture(lectureId: number): Promise<{ lecture: Lecture; watch_time_minutes: number; is_completed: boolean }> {
    const response = await fetch(`${API_BASE}/student/lectures/${lectureId}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async postWatchActivity(data: WatchActivityRequest): Promise<WatchActivityResponse> {
    const response = await fetch(`${API_BASE}/student/watch-activity`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // ============================================
  // INSTRUCTOR API
  // ============================================

  async getInstructorDashboard(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/instructor/`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getInstructorCourses(): Promise<Course[]> {
    const response = await fetch(`${API_BASE}/instructor/courses`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getInstructorCourse(courseId: number): Promise<Course> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async createCourse(data: { title: string; description: string; category: string; thumbnail_url?: string }): Promise<Course> {
    const response = await fetch(`${API_BASE}/instructor/courses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  async updateCourse(
    courseId: number,
    data: { title?: string; description?: string; thumbnail_url?: string }
  ): Promise<Course> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  async deleteCourse(courseId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Lectures
  async getCourseLectures(courseId: number): Promise<Lecture[]> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getLecture(courseId: number, lectureId: number): Promise<Lecture> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures/${lectureId}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async createLecture(
    courseId: number,
    data: {
      title: string;
      description: string;
      video_url: string;
      duration: number;
      price_per_10_mins: number;
      order_index?: number;
    }
  ): Promise<Lecture> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  async updateLecture(
    courseId: number,
    lectureId: number,
    data: {
      title?: string;
      description?: string;
      video_url?: string;
      duration?: number;
      price_per_10_mins?: number;
      order_index?: number;
    }
  ): Promise<Lecture> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures/${lectureId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  async deleteLecture(courseId: number, lectureId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures/${lectureId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }
}

export const api = new ApiClient();

// Export API base URL for backwards compatibility
export const API_BASE_URL = API_BASE;