import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Student, AttendanceRecord, FaceRecognitionResponse } from '../types';

const API_URL = 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Student service
export const studentService = {
  getAllStudents: () => api.get<Student[]>('/students'),
  createStudent: (data: Omit<Student, 'id'>) => api.post<Student>('/students', data),
  getStudentById: (id: number) => api.get<Student>(`/students/${id}`),
  resetDatabase: () => api.post('/reset'),
  deleteStudent: (id: number) => api.delete(`/students/${id}`),
};

// Attendance service
export const attendanceService = {
  markAttendance: (studentId: number) => api.post<AttendanceRecord>('/attendance', { student_id: studentId }),
  markAttendanceByFace: (faceEncoding: number[]) => api.post<FaceRecognitionResponse>('/attendance/face-recognition', { face_encoding: faceEncoding }),
  getTodayAttendance: async () => {
    try {
      // Use the correct today endpoint
      const response = await api.get<AttendanceRecord[]>('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      // Fall back to the regular attendance endpoint if the today endpoint fails
      try {
        const fallbackResponse = await api.get<AttendanceRecord[]>('/attendance');
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return []; // Return empty array if both attempts fail
      }
    }
  },
  getStudentAttendance: async (studentId: number) => {
    const response = await api.get<AttendanceRecord[]>(`/attendance/${studentId}`);
    return response.data;
  },
  getAllAttendance: async () => {
    const response = await api.get<AttendanceRecord[]>('/attendance');
    return response.data;
  },
  getAnalytics: async () => {
    const response = await api.get('/attendance/analytics');
    return response.data;
  }
};

// Face recognition service
export const faceRecognitionService = {
  recognizeFace: async (imageData: string) => {
    const response = await api.post('/face-recognition', {
      image: imageData,
    });
    return response.data;
  },

  encodeFace: async (imageData: string) => {
    const response = await api.post('/face-recognition/encode', {
      image: imageData,
    });
    return response.data;
  },
};

export default api; 