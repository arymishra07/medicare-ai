import api from './api';

export const adminService = {
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  doctors: (params) => api.get('/admin/doctors', { params }),
  appointments: (params) => api.get('/appointments', { params }),
  updateAppointmentStatus: (id, payload) => api.patch(`/appointments/${id}/status`, payload),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),
  analytics: (params) => api.get('/admin/analytics', { params }),
};
