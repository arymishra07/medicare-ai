import api from './api';

export const medicineService = {
  list: () => api.get('/medicines'),
  today: (date) => api.get('/medicines/today', { params: date ? { date } : {} }),
  create: (payload) => api.post('/medicines', payload),
  update: (id, payload) => api.put(`/medicines/${id}`, payload),
  remove: (id) => api.delete(`/medicines/${id}`),
  logDose: (id, payload) => api.post(`/medicines/${id}/log`, payload),
  stats: () => api.get('/medicines/stats'),
};

export const recordService = {
  list: (params) => api.get('/records', { params }),
  upload: (formData, onUploadProgress) =>
    api.post('/records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 60000,
    }),
  get: (id) => api.get(`/records/${id}`),
  download: (id, inline = false) =>
    api.get(`/records/${id}/download${inline ? '?inline=true' : ''}`, {
      responseType: 'blob',
      timeout: 60000,
    }),
  remove: (id) => api.delete(`/records/${id}`),
};

export const chatService = {
  history: () => api.get('/chat/history'),
  send: (message) => api.post('/chat/message', { message }),
  clear: () => api.delete('/chat/history'),
};

export const dashboardService = {
  patient: () => api.get('/dashboard/patient'),
  doctor: () => api.get('/dashboard/doctor'),
  admin: () => api.get('/dashboard/admin'),
};

export const notificationService = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};
