import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

API.interceptors.request.use((config) => {
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
