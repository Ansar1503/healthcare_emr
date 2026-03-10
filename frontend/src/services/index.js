import api from './api';

// ================================================================
// Auth Services
// ================================================================
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// ================================================================
// Doctor Services
// ================================================================
export const doctorService = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
};

// ================================================================
// Patient Services
// ================================================================
export const patientService = {
  search: (q, page = 1) => api.get('/patients/search', { params: { q, page } }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
};

// ================================================================
// Appointment Services
// ================================================================
export const appointmentService = {
  getAll: (params) => api.get('/appointments', { params }),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  markArrived: (id) => api.post(`/appointments/${id}/arrive`),
};

// ================================================================
// Slot Services
// ================================================================
export const slotService = {
  getSlots: (doctorId, date) => api.get('/slots', { params: { doctorId, date } }),
};

// ================================================================
// User Management Services
// ================================================================
export const userService = {
  getAll: (params) => api.get('/users', { params }),
  createReceptionist: (data) => api.post('/users/receptionist', data),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
};
