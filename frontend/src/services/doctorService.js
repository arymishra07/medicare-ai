import api from './api';

export const doctorService = {
  list: (params) => api.get('/doctors', { params }),
  specializations: () => api.get('/doctors/specializations'),
  get: (id) => api.get(`/doctors/${id}`),
  slots: (id, date) => api.get(`/doctors/${id}/slots`, { params: { date } }),
  myAvailability: () => api.get('/doctors/me/availability'),
  updateAvailability: (payload) => api.put('/doctors/me/availability', payload),
  myPatients: () => api.get('/doctors/me/patients'),
  patientDetail: (patientId) => api.get(`/doctors/me/patients/${patientId}`),
};

export default doctorService;
