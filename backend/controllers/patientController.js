import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import MedicineReminder from '../models/MedicineReminder.js';
import User from '../models/User.js';
import { memoryStore } from '../config/memoryStore.js';
import {
  validateAppointmentSchedule,
  calculateBillingBreakdown,
  generateBatchNotifications
} from '../services/appointmentWorkerService.js';

// Helper to emit socket events reliably
const emitSocketEvents = (eventName, data, rooms = []) => {
  if (global.io) {
    global.io.emit(eventName, data);
    rooms.forEach((room) => {
      if (room) global.io.to(room).emit(eventName, data);
    });
  }
};

// @desc    Book an Appointment (With Worker Threads & WebSocket emission)
export const bookAppointment = async (req, res) => {
  const { doctorId, date, timeSlot, symptoms, isEmergency } = req.body;
  const patientId = req.user._id;

  if (!doctorId || !date || !timeSlot) {
    return res.status(400).json({ message: 'Doctor, date, and time slot are required.' });
  }

  try {
    let existingAppointments = [];
    let doctorData = null;
    let patientData = req.user;

    if (global.isMongoConnected) {
      existingAppointments = await Appointment.find({ doctorId });
      doctorData = await User.findById(doctorId).select('-password');
    } else {
      existingAppointments = memoryStore.getAllAppointments().filter((a) => {
        const dId = typeof a.doctorId === 'object' ? a.doctorId?._id : a.doctorId;
        return String(dId) === String(doctorId);
      });
      doctorData = memoryStore.getUserById(doctorId);
    }

    // Worker thread conflict check
    const validationResult = await validateAppointmentSchedule({
      doctorId,
      date,
      timeSlot,
      existingAppointments,
      doctorData,
      patientData
    });

    if (validationResult.isConflict) {
      return res.status(409).json({
        message: `Time slot ${timeSlot} on ${date} is already booked for this doctor.`,
        bookedSlots: validationResult.bookedSlotsOnDate,
        suggestedSlots: validationResult.remainingAvailableSlots,
        conflict: true
      });
    }

    // Billing estimation via Worker Threads
    const billingResult = await calculateBillingBreakdown({
      doctorFee: doctorData?.consultationFee || 150,
      isEmergency: !!isEmergency,
      items: []
    });

    let appointment;
    const appointmentAmount = billingResult.grandTotal || doctorData?.consultationFee || 150;

    if (global.isMongoConnected) {
      const created = await Appointment.create({
        patientId,
        doctorId,
        date,
        timeSlot,
        symptoms: symptoms || 'General Consultation',
        status: 'Pending',
        paymentStatus: 'Pending',
        amount: appointmentAmount
      });

      appointment = await Appointment.findById(created._id)
        .populate('patientId', 'name email phone gender age bloodGroup photo dob address')
        .populate('doctorId', 'name email phone specialization consultationFee photo degree qualification');
    } else {
      appointment = memoryStore.createAppointment({
        patientId,
        doctorId,
        date,
        timeSlot,
        symptoms: symptoms || 'General Consultation'
      });
      appointment.amount = appointmentAmount;
    }

    // Worker thread notifications
    generateBatchNotifications({
      appointment,
      doctor: doctorData,
      patient: patientData
    }).catch((err) => console.error('[WorkerThread] Batch notification error:', err));

    // Emit WebSocket events
    const rawDoctorId = typeof appointment.doctorId === 'object' ? appointment.doctorId._id : appointment.doctorId;
    const rawPatientId = typeof appointment.patientId === 'object' ? appointment.patientId._id : appointment.patientId;

    emitSocketEvents('appointment:created', appointment, [
      `doctor_${rawDoctorId}`,
      `patient_${rawPatientId}`,
      'admin_room'
    ]);

    if (global.io) {
      global.io.emit('doctor:availability_updated', {
        doctorId: rawDoctorId,
        date,
        timeSlot,
        isBooked: true
      });
    }

    return res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get My Appointments (Patient)
export const getMyAppointments = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointments = await Appointment.find({ patientId: req.user._id })
        .populate('doctorId', 'name specialization phone photo degree qualification consultationFee')
        .sort({ createdAt: -1 });
      return res.json(appointments);
    } else {
      const appointments = memoryStore.getPatientAppointments(req.user._id);
      return res.json(appointments);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get My Prescriptions (Patient)
export const getMyPrescriptions = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const prescriptions = await Prescription.find({ patientId: req.user._id })
        .populate('doctorId', 'name specialization phone photo degree qualification')
        .populate('appointmentId', 'date timeSlot symptoms status')
        .sort({ createdAt: -1 });
      return res.json(prescriptions);
    } else {
      const prescriptions = memoryStore.getPatientPrescriptions(req.user._id);
      return res.json(prescriptions);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add Medicine Reminder
export const createMedicineReminder = async (req, res) => {
  const { medicineName, reminderTimes, startDate, endDate } = req.body;

  if (!medicineName || !reminderTimes) {
    return res.status(400).json({ message: 'Medicine name and reminder times are required.' });
  }

  try {
    if (global.isMongoConnected) {
      const reminder = await MedicineReminder.create({
        patientId: req.user._id,
        medicineName,
        reminderTimes,
        startDate,
        endDate
      });
      return res.status(201).json(reminder);
    } else {
      const reminder = memoryStore.createReminder({
        patientId: req.user._id,
        medicineName,
        reminderTimes,
        startDate,
        endDate
      });
      return res.status(201).json(reminder);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
