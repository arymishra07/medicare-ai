import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  FileText,
  Info,
  LogOut,
  Menu,
  MessageCircle,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/healthService';
import Avatar from './Avatar';
import { ROLE_LABELS, timeAgo } from '../utils/format';

const NOTIFICATION_ICONS = {
  appointment: CalendarDays,
  medicine: Pill,
  report: FileText,
  message: MessageCircle,
  system: Info,
};

export default function Topbar({ onMenuClick, navItems, title }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const notificationsLoaded = useRef(false);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const { data } = await notificationService.list();
      setNotifications(data.data.notifications);
      setUnread(data.data.unreadCount);
      notificationsLoaded.current = true;
    } catch {
      // Notifications are non-critical; leave the current view intact.
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matches = query.trim()
    ? navItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : navItems.slice(0, 5);

  const goTo = (path) => {
    setQuery('');
    setSearchOpen(false);
    navigate(path);
  };

  const handleNotificationClick = async (notification) => {
    setBellOpen(false);
    if (!notification.isRead) {
      try {
        await notificationService.markRead(notification._id);
        setNotifications((current) =>
          current.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
        );
        setUnread((count) => Math.max(0, count - 1));
      } catch {
        // Continue navigation even if marking read fails.
      }
    }
    if (notification.link) navigate(notification.link);
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
      toast.success('All caught up', 'Notifications marked as read.');
    } catch {
      toast.error('Could not update notifications');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out', 'Your session has ended securely.');
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={21} />
        </button>
        <div className="topbar-title">
          <span className="topbar-crumb">MediCare AI</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-search" ref={searchRef}>
          <Search size={17} />
          <input
            type="search"
            placeholder="Search your workspace"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) goTo(matches[0].to);
              if (event.key === 'Escape') setSearchOpen(false);
            }}
            aria-label="Search workspace pages"
          />
          {searchOpen && (
            <div className="search-popover">
              <span className="search-popover-label">{query ? 'Results' : 'Quick links'}</span>
              {matches.length ? (
                matches.slice(0, 6).map((item) => (
                  <button type="button" key={item.to} onClick={() => goTo(item.to)}>
                    <span className="search-result-icon"><item.icon size={15} /></span>
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="search-empty">No matching pages</p>
              )}
            </div>
          )}
        </div>

        <div className="topbar-actions">
          <div className="dropdown" ref={bellRef}>
            <button
              type="button"
              className={`icon-btn notification-btn ${bellOpen ? 'active' : ''}`}
              onClick={() => {
                setBellOpen((value) => !value);
                if (!bellOpen && !notificationsLoaded.current) loadNotifications();
              }}
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              aria-expanded={bellOpen}
            >
              <Bell size={19} />
              {unread > 0 && <span className="notification-dot">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {bellOpen && (
              <div className="dropdown-panel notification-panel">
                <div className="dropdown-head">
                  <div>
                    <strong>Notifications</strong>
                    <span>{unread} unread</span>
                  </div>
                  <button type="button" className="text-btn" onClick={markAll} disabled={!unread}>
                    <CheckCheck size={14} /> Mark all read
                  </button>
                </div>
                <div className="notification-list">
                  {loadingNotifications && !notifications.length ? (
                    <div className="notification-loading">Loading notifications…</div>
                  ) : notifications.length ? (
                    notifications.slice(0, 7).map((notification) => {
                      const Icon = NOTIFICATION_ICONS[notification.type] || Info;
                      return (
                        <button
                          type="button"
                          key={notification._id}
                          className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <span className={`notification-type type-${notification.type}`}>
                            <Icon size={16} />
                          </span>
                          <span className="notification-copy">
                            <strong>{notification.title}</strong>
                            <span>{notification.message}</span>
                            <small>{timeAgo(notification.createdAt)}</small>
                          </span>
                          {!notification.isRead && <span className="unread-dot" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="notification-empty">
                      <Bell size={20} />
                      <p>No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="dropdown profile-dropdown" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((value) => !value)}
              aria-label="Open account menu"
              aria-expanded={profileOpen}
            >
              <Avatar name={user?.name} size="sm" online />
              <span className="profile-trigger-copy">
                <strong>{user?.name?.split(' ').slice(0, 2).join(' ')}</strong>
                <small>{ROLE_LABELS[user?.role]}</small>
              </span>
              <ChevronDown size={15} />
            </button>

            {profileOpen && (
              <div className="dropdown-panel profile-panel">
                <div className="profile-panel-head">
                  <Avatar name={user?.name} size="md" />
                  <div>
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                </div>
                <div className="profile-role-line">
                  <ShieldCheck size={14} /> {ROLE_LABELS[user?.role]} account
                </div>
                <Link to="/profile" onClick={() => setProfileOpen(false)} className="profile-menu-item">
                  <UserRound size={16} /> My profile
                </Link>
                <Link to="/profile?tab=security" onClick={() => setProfileOpen(false)} className="profile-menu-item">
                  <Settings size={16} /> Security settings
                </Link>
                <button type="button" className="profile-menu-item danger" onClick={handleLogout}>
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
