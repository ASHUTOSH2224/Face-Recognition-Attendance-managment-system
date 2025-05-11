import React, { useEffect, useState } from 'react';
import { attendanceService, studentService } from '../services/api';
import { AttendanceRecord, Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, Clock, CheckSquare, XSquare, TrendingUp, Activity, AlertTriangle, RefreshCw } from 'lucide-react';

interface Analytics {
  total_students: number;
  present_today: number;
  absent_today: number;
  attendance_percentage: number;
  attendance_history: Array<{
    date: string;
    present: number;
    absent: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [lateArrivals, setLateArrivals] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use Promise.allSettled to prevent one failed API call from blocking everything
      const results = await Promise.allSettled([
        attendanceService.getTodayAttendance(),
        attendanceService.getAnalytics(),
        studentService.getAllStudents()
      ]);
      
      // Handle each API result individually
      if (results[0].status === 'fulfilled') {
        setAttendanceRecords(results[0].value);
      }
      
      if (results[1].status === 'fulfilled') {
        setAnalytics(results[1].value);
        
        // Calculate attendance trend if analytics data is available
        if (results[1].value.attendance_history.length >= 2) {
          const attendanceHistory = results[1].value.attendance_history;
          const lastTwoDays = attendanceHistory.slice(-2);
          const yesterday = lastTwoDays[0].present / (lastTwoDays[0].present + lastTwoDays[0].absent) * 100;
          const today = lastTwoDays[1].present / (lastTwoDays[1].present + lastTwoDays[1].absent) * 100;
          
          if (today > yesterday + 5) setAttendanceTrend('up');
          else if (today < yesterday - 5) setAttendanceTrend('down');
          else setAttendanceTrend('stable');
        }
      }
      
      if (results[2].status === 'fulfilled') {
        setStudents(results[2].value.data);
      }
      
      // Calculate late arrivals (after 9 AM) if attendance records are available
      if (results[0].status === 'fulfilled') {
        const records = results[0].value;
        const lateCount = records.filter(record => {
          const recordTime = new Date(record.timestamp);
          return recordTime.getHours() >= 9 && recordTime.getMinutes() > 0;
        }).length;
        setLateArrivals(lateCount);
      }
      
      // Check if any API call failed
      const failedCalls = results.filter(result => result.status === 'rejected');
      if (failedCalls.length > 0) {
        console.error('Some API calls failed:', failedCalls);
        setError('Some data could not be loaded. Please try refreshing the page.');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prepare time distribution data
  const getTimeDistribution = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [
        { name: 'No Data', value: 1 }
      ];
    }
    
    const timeDistribution = attendanceRecords.reduce((acc, record) => {
      const hour = new Date(record.timestamp).getHours();
      const timeSlot = hour < 9 ? 'Early (Before 9AM)' : 
                     hour < 12 ? 'Morning (9-12)' : 
                     hour < 15 ? 'Afternoon (12-3)' : 'Evening (After 3)';
      
      if (!acc[timeSlot]) {
        acc[timeSlot] = 0;
      }
      acc[timeSlot] += 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeDistribution).map(([name, value]) => ({
      name,
      value
    }));
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Attendance Dashboard</h1>
        
        {error && (
          <button 
            onClick={fetchData} 
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics?.total_students || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Present Today</p>
              <p className="text-3xl font-semibold text-green-600">{analytics?.present_today || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
              <XSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Absent Today</p>
              <p className="text-3xl font-semibold text-red-600">{analytics?.absent_today || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
              <p className="text-3xl font-semibold text-indigo-600">{analytics?.attendance_percentage || 0}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance Trend</p>
              <div className="flex items-center">
                <p className="text-xl font-semibold">
                  {attendanceTrend === 'up' ? 'Improving' : 
                   attendanceTrend === 'down' ? 'Declining' : 'Stable'}
                </p>
                {attendanceTrend === 'up' && <TrendingUp className="h-5 w-5 ml-2 text-green-500" />}
                {attendanceTrend === 'down' && <TrendingUp className="h-5 w-5 ml-2 text-red-500 transform rotate-180" />}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Late Arrivals</p>
              <p className="text-xl font-semibold text-yellow-600">
                {lateArrivals} 
                <span className="text-sm text-gray-500 ml-1">
                  ({analytics?.present_today ? Math.round((lateArrivals / analytics.present_today) * 100) : 0}%)
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Absence Risk</p>
              <p className="text-xl font-semibold">
                {analytics?.absent_today && analytics?.total_students && 
                 analytics.absent_today > (analytics.total_students * 0.3) ? 
                 <span className="text-red-600 flex items-center">
                   <AlertTriangle className="h-5 w-5 mr-1" /> High
                 </span> : 
                 <span className="text-green-600">Low</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Attendance History Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">7-Day Attendance History</h2>
          {!analytics?.attendance_history ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <AlertTriangle className="h-12 w-12 mb-2 text-gray-400" />
              <p>No attendance history data available</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.attendance_history}>
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
          )}
        </div>
        
        {/* Time Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Today's Attendance by Time</h2>
          {attendanceRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Clock className="h-12 w-12 mb-2 text-gray-400" />
              <p>No attendance records for today</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getTimeDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getTimeDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Today's Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!attendanceRecords || attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm">No attendance records found for today</p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => {
                  const student = students.find(s => s.id === record.student_id);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{record.student_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{student?.full_name || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(record.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
