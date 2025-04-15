import Dexie, { Table } from 'dexie';
import { compareFaceDescriptors } from './faceDetection';

// Define the student interface
export interface Student {
  id?: number;
  name: string;
  rollNumber: string;
  class: string;
  faceDescriptor: Float32Array; // Face recognition data
  imageUrl: string; // URL to the student's image
  createdAt: Date;
}

// Define the attendance interface
export interface Attendance {
  id?: number;
  studentId: number;
  date: Date;
  status: 'present' | 'absent';
  timeIn?: Date;
}

// Define the database class
export class AttendanceDatabase extends Dexie {
  students!: Table<Student>;
  attendance!: Table<Attendance>;

  constructor() {
    super('AttendanceDatabase');
    this.version(1).stores({
      students: '++id, name, rollNumber, class',
      attendance: '++id, studentId, date, status'
    });
  }

  // Reset the database
  async resetDatabase() {
    try {
      await this.delete();
      await this.open();
      console.log('Database reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting database:', error);
      return false;
    }
  }

  // Check if database is ready
  async isReady() {
    try {
      await this.open();
      return true;
    } catch (error) {
      console.error('Database not ready:', error);
      return false;
    }
  }

  // Add a new student
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    try {
      if (!await this.isReady()) {
        throw new Error('Database not ready');
      }
      return await this.students.add({
        ...student,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  }

  // Get all students
  async getAllStudents() {
    try {
      if (!await this.isReady()) {
        throw new Error('Database not ready');
      }
      return await this.students.toArray();
    } catch (error) {
      console.error('Error getting students:', error);
      throw error;
    }
  }

  // Find a student by face descriptor
  async findStudentByFace(faceDescriptor: Float32Array) {
    try {
      if (!await this.isReady()) {
        throw new Error('Database not ready');
      }
      const students = await this.getAllStudents();
      let bestMatch: Student | null = null;

      for (const student of students) {
        const isSameUser = compareFaceDescriptors(
          faceDescriptor,
          student.faceDescriptor,
          100
        );

        if (isSameUser) {
          bestMatch = student;
          break;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error finding student by face:', error);
      throw error;
    }
  }

  // Mark attendance for a student
  async markAttendance(studentId: number, status: 'present' | 'absent' = 'present') {
    try {
      if (!await this.isReady()) {
        throw new Error('Database not ready');
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingRecord = await this.attendance
        .where({ studentId })
        .and(item => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        })
        .first();

      if (existingRecord) {
        return await this.attendance.update(existingRecord.id as number, {
          status,
          timeIn: status === 'present' ? new Date() : undefined
        });
      }

      return await this.attendance.add({
        studentId,
        date: today,
        status,
        timeIn: status === 'present' ? new Date() : undefined
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  }

  // Get today's attendance
  async getTodayAttendance() {
    try {
      if (!await this.isReady()) {
        throw new Error('Database not ready');
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return await this.attendance
        .filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === today.getTime();
        })
        .toArray();
    } catch (error) {
      console.error('Error getting today\'s attendance:', error);
      throw error;
    }
  }
}

// Create and export a database instance
export const db = new AttendanceDatabase();

// Initialize database
db.isReady().then(isReady => {
  if (!isReady) {
    console.error('Failed to initialize database');
  }
});
