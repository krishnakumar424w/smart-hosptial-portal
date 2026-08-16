import express from 'express';
import { 
  bookAppointment, 
  getMyAppointments, 
  getMyPrescriptions, 
  createMedicineReminder 
} from '../controllers/patientController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Book a new appointment
router.post('/appointments', protect, authorizeRoles('patient'), bookAppointment);

// Get patient's appointments (matches both /patient/appointments and /patient/appointments/patient)
router.get('/appointments', protect, authorizeRoles('patient'), getMyAppointments);
router.get('/appointments/patient', protect, authorizeRoles('patient'), getMyAppointments);

// Get patient's prescriptions (matches both /patient/prescriptions and /patient/prescriptions/patient)
router.get('/prescriptions', protect, authorizeRoles('patient'), getMyPrescriptions);
router.get('/prescriptions/patient', protect, authorizeRoles('patient'), getMyPrescriptions);

// Create medicine reminder
router.post('/reminders', protect, authorizeRoles('patient'), createMedicineReminder);

export default router;