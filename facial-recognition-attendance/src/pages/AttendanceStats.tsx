import React, { useEffect, useState } from 'react';
import { attendanceService, studentService } from '../services/api';
import { AttendanceRecord, Student } from '../types';
import { Calendar, Clock, Users, PieChart, BarChart as BarChartIcon, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

interface DailyAttendance {
  date: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

interface TimeSlot {
  hour: string;
  count: number;
  percentage: number;
}

const AttendanceStats: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [studentStats, setStudentStats] = useState<{ id: number; name: string; attendance: number; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'daily' | 'time' | 'student'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceData, studentsResponse] = await Promise.all([
          attendanceService.getAllAttendance(),
          studentService.getAllStudents()
        ]);
        
        setAttendanceRecords(attendanceData);
        setStudents(studentsResponse.data);
        
        calculateStats(attendanceData, studentsResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch attendance data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateStats = (attendance: AttendanceRecord[], students: Student[]) => {
    // Calculate daily attendance
    const attendanceByDate = attendance.reduce((acc, record) => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { present: 0, absent: 0 };
      }
      if (record.status === 'present') {
        acc[date].present += 1;
      } else {
        acc[date].absent += 1;
      }
      return acc;
    }, {} as Record<string, { present: number; absent: number }>);

    const totalStudents = students.length;
    const dailyStats = Object.entries(attendanceByDate)
      .map(([date, stats]) => {
        const total = stats.present + stats.absent;
        return {
          date,
          present: stats.present,
          absent: totalStudents - stats.present,
          total: totalStudents,
          percentage: Math.round((stats.present / totalStudents) * 100)
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 14) // Last 14 days
      .reverse(); // Chronological order

    setDailyAttendance(dailyStats);

    // Calculate time slot distribution
    const timeDistribution = attendance.reduce((acc, record) => {
      const hour = new Date(record.timestamp).getHours();
      const timeSlot = hour < 12 ? 'Morning (6-11)' : 
                       hour < 17 ? 'Afternoon (12-16)' : 'Evening (17-23)';
      
      if (!acc[timeSlot]) {
        acc[timeSlot] = 0;
      }
      acc[timeSlot] += 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRecords = attendance.length;
    const timeSlotStats = Object.entries(timeDistribution)
      .map(([hour, count]) => ({
        hour,
        count,
        percentage: Math.round((count / totalRecords) * 100)
      }))
      .sort((a, b) => {
        const order = ['Morning (6-11)', 'Afternoon (12-16)', 'Evening (17-23)'];
        return order.indexOf(a.hour) - order.indexOf(b.hour);
      });

    setTimeSlots(timeSlotStats);

    // Calculate student attendance percentages
    const attendanceByStudent = attendance.reduce((acc, record) => {
      if (!acc[record.student_id]) {
        acc[record.student_id] = 0;
      }
      if (record.status === 'present') {
        acc[record.student_id] += 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const dateDiff = dailyStats.length > 0 ? dailyStats.length : 1;
    
    const studentAttendanceStats = students.map(student => {
      const attendanceCount = attendanceByStudent[student.id] || 0;
      return {
        id: student.id,
        name: student.full_name,
        attendance: attendanceCount,
        percentage: Math.round((attendanceCount / dateDiff) * 100)
      };
    }).sort((a, b) => b.percentage - a.percentage);

    setStudentStats(studentAttendanceStats);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Attendance Statistics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-3xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance Records</p>
              <p className="text-3xl font-semibold text-gray-900">{attendanceRecords.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Attendance Rate</p>
              <p className="text-3xl font-semibold text-gray-900">
                {dailyAttendance.length > 0 
                  ? `${Math.round(dailyAttendance.reduce((sum, day) => sum + day.percentage, 0) / dailyAttendance.length)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Most Active Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {timeSlots.length > 0 
                  ? timeSlots.sort((a, b) => b.count - a.count)[0].hour
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedMetric('daily')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                selectedMetric === 'daily'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-5 w-5 inline-block mr-2" />
              Daily Attendance
            </button>
            <button
              onClick={() => setSelectedMetric('time')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                selectedMetric === 'time'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="h-5 w-5 inline-block mr-2" />
              Time Distribution
            </button>
            <button
              onClick={() => setSelectedMetric('student')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                selectedMetric === 'student'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              Student Statistics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedMetric === 'daily' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Daily Attendance Trends</h3>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>Present
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>Absent
                  </span>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" name="Present" fill="#10B981" />
                    <Bar dataKey="absent" name="Absent" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {selectedMetric === 'time' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Attendance Time Distribution</h3>
                <div className="flex items-center">
                  <Layers className="h-5 w-5 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-500">Based on {attendanceRecords.length} records</span>
                </div>  
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={timeSlots}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="hour"
                    >
                      {timeSlots.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} records`, props.payload.hour]} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {selectedMetric === 'student' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Student Attendance Rates</h3>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ≥ 75% Good
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    50-74% Average
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    &lt; 50% Poor
                  </span>
                </div> 
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentStats.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.attendance}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className={`w-16 h-2 rounded-full mr-2 ${
                                student.percentage >= 75 ? 'bg-green-500' : 
                                student.percentage >= 50 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.max(16, student.percentage)}px` }}
                            />
                            <span className={`text-sm font-medium ${
                              student.percentage >= 75 ? 'text-green-600' : 
                              student.percentage >= 50 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {student.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-3">Understanding Attendance Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Daily Trends</span>
            </div>
            <p className="text-gray-600 text-sm">Track attendance patterns over time to identify trends and potential issues</p>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Time Distribution</span>
            </div>
            <p className="text-gray-600 text-sm">Analyze when students are most likely to attend and optimize scheduling</p>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Student Performance</span>
            </div>
            <p className="text-gray-600 text-sm">Identify students with attendance issues to provide targeted support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats; 