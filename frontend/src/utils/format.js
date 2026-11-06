export const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Administrator',
};

export const roleHome = (role) => {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/patient/dashboard';
};

export const STATUS_META = {
  pending: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Confirmed', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  completed: { label: 'Completed', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const MEDICINE_COLORS = ['teal', 'blue', 'green', 'violet', 'amber', 'rose'];

export const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const REPORT_TYPES = [
  'Lab Report',
  'Blood Test',
  'Radiology',
  'Prescription',
  'Discharge Summary',
  'Vaccination',
  'Other',
];

export const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Gynecology',
  'Psychiatry',
  'Dentistry',
  'Ophthalmology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'Pulmonology',
];

export const todayString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export const addDays = (dateString, days) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

export const formatDate = (value, style = 'medium') => {
  if (!value) return '—';
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const options =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

  return date.toLocaleDateString('en-US', options);
};

export const formatRelativeDay = (dateString) => {
  const today = todayString();
  if (dateString === today) return 'Today';
  if (dateString === addDays(today, 1)) return 'Tomorrow';
  if (dateString === addDays(today, -1)) return 'Yesterday';
  return formatDate(dateString, 'short');
};

export const formatTime = (time) => {
  if (!time) return '—';
  const [hourString, minute] = time.split(':');
  const hour = Number(hourString);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const timeAgo = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value, 'short');
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MC';

export const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const getInitialsColor = (name = '') => {
  const palettes = [
    'linear-gradient(135deg, #0d9488, #14b8a6)',
    'linear-gradient(135deg, #2563eb, #60a5fa)',
    'linear-gradient(135deg, #7c3aed, #a78bfa)',
    'linear-gradient(135deg, #059669, #34d399)',
    'linear-gradient(135deg, #ea580c, #fb923c)',
    'linear-gradient(135deg, #db2777, #f472b6)',
  ];
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palettes[sum % palettes.length];
};

export const truncate = (text = '', length = 120) =>
  text.length > length ? `${text.slice(0, length).trim()}…` : text;
