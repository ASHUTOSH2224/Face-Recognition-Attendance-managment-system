export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  face_encoding: number[];
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  timestamp: string;
  status: 'present' | 'absent';
}

export interface FaceRecognitionResponse extends AttendanceRecord {
  full_name?: string;
  message?: string;
} 