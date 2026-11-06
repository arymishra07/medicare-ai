import { NavLink } from 'react-router-dom';
import {
  Activity,
  CalendarCheck2,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import { ROLE_LABELS } from '../utils/format';

const SUPPORT_CARDS = {
  patient: {
    icon: Sparkles,
    title: 'Need health guidance?',
    text: 'Ask MediCare AI about symptoms, prevention and healthy habits.',
    cta: 'Open AI assistant',
    to: '/patient/chat',
  },
  doctor: {
    icon: CalendarCheck2,
    title: 'Keep your schedule current',
    text: 'Update working hours so patients only see slots you can honour.',
    cta: 'Manage availability',
    to: '/doctor/availability',
  },
  admin: {
    icon: Activity,
    title: 'Platform at a glance',
    text: 'Monitor appointments, verify doctors and review growth analytics.',
    cta: 'View insights',
    to: '/admin/dashboard',
  },
};

export default function Sidebar({ open, onClose, sections, user }) {
  const support = SUPPORT_CARDS[user?.role] || SUPPORT_CARDS.patient;

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <Logo />
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-role">
          <span className="sidebar-role-icon">
            {user?.role === 'admin' ? <ShieldCheck size={15} /> : <HeartPulse size={15} />}
          </span>
          <span>{ROLE_LABELS[user?.role] || 'Member'} workspace</span>
          <span className="sidebar-role-dot" />
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">
                    <item.icon size={19} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                  <ChevronRight size={15} className="nav-chevron" />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <LinkCard support={support} />
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div className="sidebar-user-copy">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <div className="sidebar-security">
            <ShieldCheck size={13} /> Encrypted & private by design
          </div>
        </div>
      </aside>
    </>
  );
}

function LinkCard({ support }) {
  const Icon = support.icon;
  return (
    <NavLink to={support.to} className="support-card" onClick={() => {}}>
      <span className="support-card-icon">
        <Icon size={18} />
      </span>
      <strong>{support.title}</strong>
      <p>{support.text}</p>
      <span className="support-card-link">{support.cta} <ChevronRight size={13} /></span>
    </NavLink>
  );
}
