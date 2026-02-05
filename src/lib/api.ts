// API Service Layer - Centralized API client with authentication

const API_BASE = 'https://sequestrable-elsie-knurliest.ngrok-free.dev';
const PAYMENT_API_BASE = 'https://overgreedily-subtruncate-theresa.ngrok-free.dev/api/v1';

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
  average_rating?: number;
  review_count?: number;
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
  view_count?: number;
  created_at: string;
}

export interface LectureWithProgress extends Lecture {
  progress?: number;
  completed?: boolean;
}

export interface CourseWithLectures extends Course {
  lectures: LectureWithProgress[];
}


export interface StudentDashboard {
  user_id?: number;
  email: string;
  name: string;
  wallet_balance: number;
  total_courses_accessed?: number;
  total_watch_time_minutes?: number;
}

export interface ChunkActivity {
  index: number;
  start_time: number;
  end_time: number;
  visit_count: number;
}

export interface LectureChunksResponse {
  lecture_id: number;
  chunks: ChunkActivity[];
}

export interface WalletBalanceResponse {
  user_id: number;
  wallet_balance: number;
  currency: string;
}

export interface DepositResponse {
  payment_url: string;
  payment_intent_id: string;
  status: string;
  message: string;
}

export interface SessionStartResponse {
  session_id: number;
  status: string;
  wallet_balance: number;
  message: string;
}

export interface SessionEndResponse {
  status: string;
  total_amount_spent: number;
  total_cost: number;
  wallet_balance_remaining: number;
  message: string;
}

export interface LectureReview {
  id: number;
  student_id: number;
  lecture_id: number;
  rating: number;
  review?: string;
  hidden: boolean;
  created_at: string;
}

// ============================================
// API CLIENT
// ============================================

class ApiClient {
  private getAuthHeaders(contentType: string | null = 'application/json'): HeadersInit {
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Authorization': token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
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

  async getStudentLecture(lectureId: number): Promise<{
    lecture: Lecture;
    amount_spent_for_lecture: number;
    watch_time_seconds: number;
  }> {
    const response = await fetch(`${API_BASE}/student/lectures/${lectureId}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async reportChunkVisit(lectureId: number, timestamp: number): Promise<{
    status: string;
    chunk_index: number;
    visit_count: number;
    session_visit_count: number;
    charged: boolean;
    charge_amount: number;
    recharge: boolean;
  }> {
    const response = await fetch(`${API_BASE}/student/chunk-visit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ lecture_id: lectureId, timestamp }),
    });

    return this.handleResponse(response);
  }

  async getLectureChunks(lectureId: number): Promise<LectureChunksResponse> {
    const response = await fetch(`${API_BASE}/student/lectures/${lectureId}/chunks`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async postLectureReview(lectureId: number, rating: number, review: string): Promise<LectureReview> {
    const response = await fetch(`${API_BASE}/student/lectures/${lectureId}/review`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rating, review }),
    });
    return this.handleResponse(response);
  }

  async getLectureReviews(lectureId: number): Promise<LectureReview[]> {
    const response = await fetch(`${API_BASE}/student/lectures/${lectureId}/reviews`, {
      headers: this.getAuthHeaders(),
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

  async createCourse(data: { title: string; description: string; category: string; image?: File }): Promise<Course> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await fetch(`${API_BASE}/instructor/courses`, {
      method: 'POST',
      headers: this.getAuthHeaders(null),
      body: formData,
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
      video: File;
      duration: number;
      price_per_10_mins: number;
    }
  ): Promise<Lecture> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price_per_10_mins', data.price_per_10_mins.toString());
    formData.append('duration', data.duration.toString());
    formData.append('video', data.video);

    const response = await fetch(`${API_BASE}/instructor/courses/${courseId}/lectures`, {
      method: 'POST',
      headers: this.getAuthHeaders(null),
      body: formData,
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

class PaymentApiClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(error);
      } catch (e) {
        errorData = error;
      }
      throw new Error(errorData.detail?.message || errorData.detail || `Payment API Error: ${response.status}`);
    }
    return response.json();
  }

  async getWalletBalance(userId: number): Promise<WalletBalanceResponse> {
    const response = await fetch(`${PAYMENT_API_BASE}/wallet/balance/${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async initiateDeposit(userId: number, amount: number): Promise<DepositResponse> {
    const response = await fetch(`${PAYMENT_API_BASE}/wallet/deposit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ user_id: userId, amount }),
    });
    return this.handleResponse(response);
  }

  async confirmDeposit(intentId: string, data?: any): Promise<{ status: string }> {
    const response = await fetch(`${PAYMENT_API_BASE}/wallet/deposit/confirm/${intentId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse(response);
  }

  async startSession(userId: number, courseId: number): Promise<SessionStartResponse> {
    const response = await fetch(`${PAYMENT_API_BASE}/session/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ student_id: userId, course_id: courseId }),
    });
    return this.handleResponse(response);
  }

  async endSession(studentId: number, courseId: number, totalMinutes: number): Promise<SessionEndResponse> {
    const response = await fetch(`${PAYMENT_API_BASE}/session/end`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ student_id: studentId, course_id: courseId, total_amount_spent: totalMinutes }),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiClient();
export const paymentApi = new PaymentApiClient();

// Export API base URL for backwards compatibility
export const API_BASE_URL = API_BASE;

/**
 * Formats an asset URL. If the URL starts with /uploads, it prepends the API_BASE.
 */
export const formatUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('/uploads')) {
    return `${API_BASE}${url}`;
  }
  return url;
};