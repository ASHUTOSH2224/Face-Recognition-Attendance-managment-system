import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, UserPlus, Camera, Users, Calendar, BarChart } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/students', name: 'Students', icon: <Users className="w-5 h-5" /> },
    { path: '/register', name: 'Register Student', icon: <UserPlus className="w-5 h-5" /> },
    { path: '/take-attendance', name: 'Take Attendance', icon: <Camera className="w-5 h-5" /> },
    { path: '/attendance-calendar', name: 'Attendance Calendar', icon: <Calendar className="w-5 h-5" /> },
    { path: '/attendance-stats', name: 'Attendance Stats', icon: <BarChart className="w-5 h-5" /> }
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2 rounded-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar for mobile (overlay) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      ></div>

      {/* Sidebar content */}
      <aside
        className={`bg-white h-screen flex flex-col border-r fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out w-64 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-16 border-b">
          <h2 className="text-xl font-semibold text-indigo-600">
            Face Attendance
          </h2>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    if (isOpen) {
                      setIsOpen(false);
                    }
                  }}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
              <span className="text-sm font-bold">FRS</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Facial Recognition</p>
              <p className="text-xs text-gray-500">Attendance System</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed sidebar in desktop view */}
      <div className="hidden md:block w-64 flex-shrink-0"></div>
    </>
  );
};

export default Sidebar;
