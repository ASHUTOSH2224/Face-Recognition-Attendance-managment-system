import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Student, AttendanceRecord } from '../types';

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
};

// Attendance service
export const attendanceService = {
  markAttendance: (studentId: number) => api.post<AttendanceRecord>('/attendance', { student_id: studentId }),
  getTodayAttendance: async () => {
    const response = await api.get<AttendanceRecord[]>('/attendance/today');
    return response.data;
  },
  getStudentAttendance: async (studentId: number) => {
    const response = await api.get<AttendanceRecord[]>(`/attendance/${studentId}`);
    return response.data;
  },
  getAllAttendance: async () => {
    const response = await api.get<AttendanceRecord[]>('/attendance');
    return response.data;
  },
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