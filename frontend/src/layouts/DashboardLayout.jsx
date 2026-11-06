import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageCircleHeart,
  Pill,
  Stethoscope,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const NAVIGATION = {
  patient: [
    {
      label: 'Workspace',
      items: [
        { to: '/patient/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/patient/doctors', label: 'Find doctors', icon: Stethoscope },
        { to: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
        { to: '/patient/medicines', label: 'Medicine reminders', icon: Pill },
        { to: '/patient/reports', label: 'Medical reports', icon: FileText },
        { to: '/patient/chat', label: 'AI health chat', icon: MessageCircleHeart },
      ],
    },
    {
      label: 'Account',
      items: [{ to: '/profile', label: 'Profile & security', icon: UserRound }],
    },
  ],
  doctor: [
    {
      label: 'Clinical workspace',
      items: [
        { to: '/doctor/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
        { to: '/doctor/patients', label: 'My patients', icon: UsersRound },
        { to: '/doctor/availability', label: 'Availability', icon: CalendarRange },
      ],
    },
    {
      label: 'Account',
      items: [{ to: '/profile', label: 'Profile & security', icon: UserRound }],
    },
  ],
  admin: [
    {
      label: 'Administration',
      items: [
        { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/admin/users', label: 'Manage users', icon: UserCog },
        { to: '/admin/doctors', label: 'Manage doctors', icon: Stethoscope },
        { to: '/admin/appointments', label: 'Appointments', icon: ClipboardList },
      ],
    },
    {
      label: 'Account',
      items: [{ to: '/profile', label: 'Profile & security', icon: UserRound }],
    },
  ],
};

const TITLE_MAP = {
  '/patient/dashboard': 'Health overview',
  '/patient/doctors': 'Find a doctor',
  '/patient/appointments': 'My appointments',
  '/patient/medicines': 'Medicine reminders',
  '/patient/reports': 'Medical reports',
  '/patient/chat': 'AI health assistant',
  '/doctor/dashboard': 'Clinical overview',
  '/doctor/appointments': 'Appointment requests',
  '/doctor/patients': 'My patients',
  '/doctor/availability': 'Working hours',
  '/admin/dashboard': 'Platform overview',
  '/admin/users': 'Manage users',
  '/admin/doctors': 'Manage doctors',
  '/admin/appointments': 'All appointments',
  '/profile': 'Profile & security',
};

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = NAVIGATION[user?.role] || NAVIGATION.patient;
  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const title = TITLE_MAP[location.pathname] || 'MediCare AI';

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${title} · MediCare AI`;
  }, [location.pathname, title]);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sections={sections}
        user={user}
      />
      <div className="app-main">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          navItems={flatItems}
          title={title}
        />
        <main className="app-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>MediCare AI · Smart Medical Assistant</span>
          <span className="app-footer-right">
            <Activity size={14} /> Your health data stays private
          </span>
        </footer>
      </div>
    </div>
  );
}
