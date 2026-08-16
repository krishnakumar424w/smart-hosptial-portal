import express from 'express';
import {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  payForAppointment,
  getDoctorBookedSlots
} from '../controllers/appointmentController.js';
import Appointment from '../models/Appointment.js';
import { protect } from '../middleware/authMiddleware.js';
import { memoryStore } from '../config/memoryStore.js';

const router = express.Router();

// Doctor Availability Slot Query
router.get('/availability', protect, getDoctorBookedSlots);

// Book appointment
router.post('/', protect, createAppointment);

// Patient Appointments
router.get('/patient', protect, getPatientAppointments);

// Doctor Appointments
router.get('/doctor', protect, getDoctorAppointments);

// Pay for appointment
router.put('/:id/pay', protect, payForAppointment);

// Update status
router.put('/:id/status', protect, updateAppointmentStatus);

// Admin / All appointments
router.get('/', protect, async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointments = await Appointment.find()
        .populate('patientId', 'name email phone age gender')
        .populate('doctorId', 'name email specialization')
        .sort({ createdAt: -1 });
      return res.json(appointments);
    } else {
      const appointments = memoryStore.getAllAppointments();
      return res.json(appointments);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// Single appointment
router.get('/:id', protect, async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointment = await Appointment.findById(req.params.id)
        .populate('patientId', 'name email phone age gender')
        .populate('doctorId', 'name email specialization');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      return res.json(appointment);
    } else {
      const allApps = memoryStore.getAllAppointments();
      const appointment = allApps.find((a) => String(a._id) === String(req.params.id));
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      return res.json(appointment);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment details', error: error.message });
  }
});

export default router;
