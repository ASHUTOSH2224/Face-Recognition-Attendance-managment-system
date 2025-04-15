import type React from 'react';
import { useState, useEffect } from 'react';
import { db, type Student, type Attendance } from '../services/db';
import { Calendar, User, Download, Search } from 'lucide-react';

interface AttendanceRecord {
  student: Student;
  attendance: Attendance;
}

const AttendanceReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch attendance records for the selected date
  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      try {
        setIsLoading(true);

        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        // Get all attendance records
        const allAttendance = await db.attendance.toArray();

        // Filter records for the selected date
        const dateRecords = allAttendance.filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === selected.getTime();
        });

        // Get student information for each record
        const records = await Promise.all(
          dateRecords.map(async attendance => {
            const student = await db.students.get(attendance.studentId);
            return {
              student: student as Student,
              attendance
            };
          })
        );

        // Set the records state
        setAttendanceRecords(records.filter(r => r.student));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching attendance:', error);
        setIsLoading(false);
      }
    };

    fetchAttendanceForDate();
  }, [selectedDate]);

  // Export attendance as CSV
  const exportToCSV = () => {
    if (attendanceRecords.length === 0) return;

    const headers = ['Name', 'Roll Number', 'Class', 'Status', 'Time'];
    const rows = attendanceRecords.map(record => [
      record.student.name,
      record.student.rollNumber,
      record.student.class,
      record.attendance.status,
      record.attendance.timeIn
        ? new Date(record.attendance.timeIn).toLocaleTimeString()
        : 'N/A'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedDate}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter records based on search query
  const filteredRecords = attendanceRecords.filter(record => {
    const query = searchQuery.toLowerCase();
    return (
      record.student.name.toLowerCase().includes(query) ||
      record.student.rollNumber.toLowerCase().includes(query) ||
      record.student.class.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        Attendance Reports
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Date Selector */}
        <div className="rounded-lg bg-white p-4 shadow">
          <label
            htmlFor="date"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Select Date
          </label>
          <div className="flex">
            <div className="relative flex-grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 p-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-lg bg-white p-4 shadow">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Search Student
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, Roll Number or Class"
              className="block w-full rounded-md border border-gray-300 p-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-end rounded-lg bg-white p-4 shadow">
          <button
            onClick={exportToCSV}
            disabled={attendanceRecords.length === 0}
            className={`flex w-full items-center justify-center rounded-md px-4 py-2 font-medium text-white ${
              attendanceRecords.length === 0
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Download className="mr-2 h-5 w-5" />
            Export as CSV
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h2>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Roll Number</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map(record => (
                  <tr key={record.attendance.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="mr-3 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {record.student.imageUrl ? (
                            <img
                              src={record.student.imageUrl}
                              alt={record.student.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-full w-full p-2" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {record.student.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {record.student.rollNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {record.student.class}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          record.attendance.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.attendance.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {record.attendance.timeIn
                        ? new Date(record.attendance.timeIn).toLocaleTimeString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-gray-500">
            {searchQuery
              ? 'No matching records found'
              : 'No attendance records for this date'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReport;
