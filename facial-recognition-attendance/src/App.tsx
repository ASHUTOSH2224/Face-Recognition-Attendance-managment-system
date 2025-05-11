import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentRegistration from './pages/StudentRegistration';
import TakeAttendance from './pages/TakeAttendance';
import Students from './pages/Students';
import AttendanceCalendar from './pages/AttendanceCalendar';
import AttendanceStats from './pages/AttendanceStats';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        
        <div className="flex-1 md:ml-64">
          <main className="p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/register" element={<StudentRegistration />} />
              <Route path="/take-attendance" element={<TakeAttendance />} />
              <Route path="/attendance-calendar" element={<AttendanceCalendar />} />
              <Route path="/attendance-stats" element={<AttendanceStats />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
