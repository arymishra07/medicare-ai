import api from './api';

export const authService = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  session: () => api.get('/auth/session'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (payload) => api.patch('/users/profile', payload),
  changePassword: (payload) => api.patch('/users/password', payload),
};
