import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StudentRegistration from './pages/StudentRegistration';
import TakeAttendance from './pages/TakeAttendance';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <Navbar />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/register" element={<StudentRegistration />} />
              <Route path="/attendance" element={<TakeAttendance />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
