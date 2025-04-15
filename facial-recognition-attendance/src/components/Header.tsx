import type React from 'react';

const Header: React.FC = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-gray-800">
          Facial Recognition Attendance System
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
