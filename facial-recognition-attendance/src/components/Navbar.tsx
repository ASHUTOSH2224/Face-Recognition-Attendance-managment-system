import React from 'react';
import { Link } from 'react-router-dom';
import { Home, UserPlus, CalendarCheck } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '4rem' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4f46e5', textDecoration: 'none' }}>
                Face Attendance
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#4f46e5',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Home style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem' }} />
              Dashboard
            </Link>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#4f46e5',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <UserPlus style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem' }} />
              Register
            </Link>
            <Link
              to="/attendance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#4f46e5',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <CalendarCheck style={{ height: '1.25rem', width: '1.25rem', marginRight: '0.5rem' }} />
              Take Attendance
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 