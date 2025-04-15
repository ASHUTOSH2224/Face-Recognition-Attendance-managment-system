import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  UserPlus,
  UserCheck,
  FileText,
  Menu
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } transition-width flex flex-col bg-white shadow duration-300 ease-in-out`}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="text-xl font-semibold">Attendance</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        <NavItem
          to="/"
          icon={<Home size={22} />}
          label="Dashboard"
          active={isActive('/')}
          collapsed={collapsed}
        />
        <NavItem
          to="/register"
          icon={<UserPlus size={22} />}
          label="Register User"
          active={isActive('/register')}
          collapsed={collapsed}
        />
        <NavItem
          to="/take-attendance"
          icon={<UserCheck size={22} />}
          label="Take Attendance"
          active={isActive('/take-attendance')}
          collapsed={collapsed}
        />
        <NavItem
          to="/reports"
          icon={<FileText size={22} />}
          label="Reports"
          active={isActive('/reports')}
          collapsed={collapsed}
        />
      </nav>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  active,
  collapsed
}) => {
  return (
    <Link
      to={to}
      className={`${
        active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-700 hover:bg-gray-100'
      } group flex items-center rounded-md px-2 py-2`}
    >
      <div className="mr-3 flex h-6 w-6 items-center justify-center">
        {icon}
      </div>
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-6 w-auto min-w-max rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow group-hover:opacity-100">
          {label}
        </span>
      )}
    </Link>
  );
};

export default Sidebar;
