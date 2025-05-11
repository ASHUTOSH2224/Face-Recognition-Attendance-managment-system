import React, { useState, useEffect } from 'react';
import { attendanceService, studentService } from '../services/api';
import { AttendanceRecord, Student } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  attendanceRecords: AttendanceRecord[];
}

interface AttendanceByDate {
  [date: string]: AttendanceRecord[];
}

const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getCalendarDays = (year: number, month: number): Date[] => {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const daysInMonth = getDaysInMonth(year, month);
  
  // Get days from previous month to fill in the first week
  const daysFromPrevMonth = [];
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
  for (let i = firstDayOfWeek; i > 0; i--) {
    const prevMonthDay = new Date(year, month, 1 - i);
    daysFromPrevMonth.push(prevMonthDay);
  }
  
  // Get days from next month to fill in the last week
  const daysFromNextMonth = [];
  const lastDayOfWeek = lastDayOfMonth.getDay();
  for (let i = 1; i < 7 - lastDayOfWeek; i++) {
    const nextMonthDay = new Date(year, month + 1, i);
    daysFromNextMonth.push(nextMonthDay);
  }
  
  return [...daysFromPrevMonth, ...daysInMonth, ...daysFromNextMonth];
};

// Format date as YYYY-MM-DD for consistency
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const AttendanceCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateAttendance, setDateAttendance] = useState<AttendanceRecord[]>([]);

  // Fetch all attendance records
  useEffect(() => {
    const fetchData = async () => {
      try {
        const attendanceData = await attendanceService.getAllAttendance();
        const studentsResponse = await studentService.getAllStudents();
        
        setAttendanceRecords(attendanceData);
        setStudents(studentsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch attendance data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update calendar days when month/year changes
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Group attendance records by date
    const attendanceByDate: AttendanceByDate = {};
    attendanceRecords.forEach(record => {
      const date = formatDate(new Date(record.timestamp));
      if (!attendanceByDate[date]) {
        attendanceByDate[date] = [];
      }
      attendanceByDate[date].push(record);
    });

    // Create calendar days with attendance data
    const days = getCalendarDays(year, month);
    const today = new Date();
    
    const calendarDaysWithData = days.map(date => {
      const dateStr = formatDate(date);
      return {
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: 
          date.getDate() === today.getDate() && 
          date.getMonth() === today.getMonth() && 
          date.getFullYear() === today.getFullYear(),
        attendanceRecords: attendanceByDate[dateStr] || []
      };
    });

    setCalendarDays(calendarDaysWithData);
  }, [currentDate, attendanceRecords]);

  // Handle date selection
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate);
      const records = attendanceRecords.filter(record => 
        formatDate(new Date(record.timestamp)) === dateStr
      );
      setDateAttendance(records);
    } else {
      setDateAttendance([]);
    }
  }, [selectedDate, attendanceRecords]);

  const goToPrevMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + 1);
      return newDate;
    });
  };

  // Get student name by ID
  const getStudentName = (studentId: number): string => {
    const student = students.find(s => s.id === studentId);
    return student ? student.full_name : `Student #${studentId}`;
  };

  const getAttendanceRate = (records: AttendanceRecord[]): string => {
    if (!records.length) return '0%';
    const presentCount = records.filter(r => r.status === 'present').length;
    return `${Math.round((presentCount / records.length) * 100)}%`;
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Attendance Calendar</h1>

      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={goToPrevMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
          >
            Today
          </button>
          <button 
            onClick={goToNextMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 h-96">
          {calendarDays.map((day, index) => {
            const hasAttendance = day.attendanceRecords.length > 0;
            const attendancePercentage = hasAttendance ? 
              day.attendanceRecords.filter(r => r.status === 'present').length / day.attendanceRecords.length : 0;
            
            return (
              <div 
                key={index} 
                className={`border-b border-r min-h-[80px] cursor-pointer
                  ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                  ${day.isToday ? 'bg-indigo-50' : ''}
                  ${selectedDate && formatDate(selectedDate) === formatDate(day.date) ? 'ring-2 ring-indigo-600 ring-inset' : ''}
                  hover:bg-gray-50
                `}
                onClick={() => setSelectedDate(day.date)}
              >
                <div className="p-2">
                  <div className="flex justify-between">
                    <span className={`text-sm font-semibold ${day.isToday ? 'text-indigo-600' : ''}`}>
                      {day.date.getDate()}
                    </span>
                    
                    {hasAttendance && (
                      <span 
                        className={`text-xs px-1.5 py-0.5 rounded-full 
                          ${attendancePercentage >= 0.75 ? 'bg-green-100 text-green-800' : 
                            attendancePercentage >= 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}
                      >
                        {day.attendanceRecords.length}
                      </span>
                    )}
                  </div>
                  
                  {hasAttendance && day.isCurrentMonth && (
                    <div className="mt-1">
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            attendancePercentage >= 0.75 ? 'bg-green-500' : 
                            attendancePercentage >= 0.5 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`} 
                          style={{ width: `${attendancePercentage * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Attendance */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Attendance for {selectedDate.toLocaleDateString()}
              </h3>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                {dateAttendance.length} {dateAttendance.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          {dateAttendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No attendance records</h3>
              <p className="text-gray-500 max-w-sm">
                There are no attendance records for this date. Select a different date or take attendance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dateAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getStudentName(record.student_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar; 