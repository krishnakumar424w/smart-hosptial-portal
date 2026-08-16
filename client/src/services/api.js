import axios from 'axios';

const getClientEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
    return import.meta.env;
  }
  return {};
};

const resolveApiBaseUrl = () => {
  const env = getClientEnv();
  const envApiUrl = String(env.VITE_API_URL || '').trim();
  const envSocketUrl = String(env.VITE_SOCKET_URL || '').trim();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }

  if (envSocketUrl) {
    return `${envSocketUrl.replace(/\/$/, '')}/api`;
  }

  if (!currentOrigin) {
    return 'http://localhost:3000/api';
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(currentOrigin);
  if (isLocalhost) {
    return 'http://localhost:3000/api';
  }

  const isVercelHost = /vercel\.app$/i.test(currentOrigin);
  if (isVercelHost) {
    console.warn('[API] Missing VITE_API_URL. Frontend host detected; requests are blocked until the backend URL is configured.');
    return null;
  }

  return `${currentOrigin.replace(/\/$/, '')}/api`;
};

const API_BASE_URL = resolveApiBaseUrl();

const API = axios.create({
  baseURL: API_BASE_URL || '',
});

API.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    const error = new Error('Backend API URL is not configured. Set VITE_API_URL to your deployed backend URL.');
    error.config = config;
    return Promise.reject(error);
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth & Profile
export const loginUser = (formData) => API.post('/auth/login', formData);
export const registerUser = (formData) => API.post('/auth/register', formData);
export const getUserProfile = () => API.get('/auth/profile');
export const updateUserProfile = (data) => API.put('/auth/profile', data);

// Patient & UPI Payments
export const bookAppointment = (data) => API.post('/appointments', data);
export const getMyAppointments = () => API.get('/appointments/patient');
export const getMyPrescriptions = () => API.get('/prescriptions/patient');
export const payWithUpi = (appointmentId, data) => API.put(`/appointments/${appointmentId}/pay`, data);
export const payPrescriptionWithUpi = (prescriptionId, data) => API.put(`/prescriptions/${prescriptionId}/pay`, data);
export const verifyUpiPayment = (data) => API.post('/payments/verify-upi', data);
export const createPaymentIntent = (data) => API.post('/payments/create-intent', data);

// Doctor
export const getDoctorAppointments = () => API.get('/appointments/doctor');
export const updateAppointmentStatus = (id, status) => API.put(`/appointments/${id}/status`, { status });
export const getDoctorAvailability = (doctorId, date) => API.get(`/appointments/availability?doctorId=${doctorId}&date=${date}`);
export const createPrescription = (data) => API.post('/doctor/prescriptions', data);
export const searchMedicines = (query) => API.get(`/inventory/search?query=${encodeURIComponent(query || '')}`);

// Hospital Medicine Inventory & Stock Management
export const getAllInventory = () => API.get('/inventory');
export const addInventoryMedicine = (data) => API.post('/inventory', data);
export const updateInventoryMedicine = (id, data) => API.put(`/inventory/${id}`, data);
export const deleteInventoryMedicine = (id) => API.delete(`/inventory/${id}`);

// Google Custom Search Medicine Information
export const searchMedicineGoogle = (query) => API.post('/medicines/google-search', { query });

// Users / Doctors
export const getAllDoctors = () => API.get('/users/doctors');
export const getAllUsers = () => API.get('/users');
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getAllAppointmentsAdmin = () => API.get('/appointments');

export default API;
