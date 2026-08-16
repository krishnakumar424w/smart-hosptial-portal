import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { memoryStore } from '../config/memoryStore.js';
import {
  validateAppointmentSchedule,
  calculateBillingBreakdown,
  generateBatchNotifications
} from '../services/appointmentWorkerService.js';
import {
  ALL_10MIN_SLOTS,
  MORNING_SLOTS,
  AFTERNOON_SLOTS,
  EVENING_SLOTS,
  isSlotConflict
} from '../utils/timeSlots.js';

// Helper to emit socket events reliably
const emitSocketEvents = (eventName, data, rooms = []) => {
  if (global.io) {
    global.io.emit(eventName, data);
    rooms.forEach((room) => {
      if (room) global.io.to(room).emit(eventName, data);
    });
  }
};

// @desc Create new appointment (Offloaded to Worker Threads + Real-time Socket Broadcast)
export const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, timeSlot, symptoms, isEmergency } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !date || !timeSlot) {
      return res.status(400).json({ message: 'Doctor, consultation date, and time slot are required.' });
    }

    const targetDateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];

    // 1. Fetch current appointment list to check concurrency/conflicts
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

    // 2. Offload schedule validation & concurrency conflict detection to Node.js Worker Thread
    const validationResult = await validateAppointmentSchedule({
      doctorId,
      date: targetDateStr,
      timeSlot,
      existingAppointments,
      doctorData,
      patientData
    });

    if (validationResult.isConflict) {
      return res.status(409).json({
        message: `Time slot "${timeSlot}" on ${targetDateStr} has already been reserved by another patient. Please pick another slot.`,
        bookedSlots: validationResult.bookedSlotsOnDate,
        suggestedSlots: validationResult.remainingAvailableSlots,
        conflict: true
      });
    }

    // 3. Offload Billing Breakdown computation to Worker Thread
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
        date: targetDateStr,
        timeSlot,
        symptoms: symptoms || 'General Consultation',
        status: 'Pending',
        paymentStatus: 'Pending',
        amount: appointmentAmount
      });

      // Populate doctor and patient details for rich real-time display
      appointment = await Appointment.findById(created._id)
        .populate('patientId', 'name email phone gender age bloodGroup photo dob address')
        .populate('doctorId', 'name email phone specialization consultationFee photo degree qualification');
    } else {
      appointment = memoryStore.createAppointment({
        patientId,
        doctorId,
        date: targetDateStr,
        timeSlot,
        symptoms: symptoms || 'General Consultation'
      });
      appointment.amount = appointmentAmount;
    }

    // 4. Offload Batch Notification preparation to Worker Thread
    generateBatchNotifications({
      appointment,
      doctor: doctorData,
      patient: patientData
    }).catch((err) => console.error('[WorkerThread] Batch notification error:', err));

    // 5. Emit real-time WebSocket events for instant slot locking across all clients
    const rawDoctorId = typeof appointment.doctorId === 'object' ? appointment.doctorId._id : appointment.doctorId;
    const rawPatientId = typeof appointment.patientId === 'object' ? appointment.patientId._id : appointment.patientId;

    const updatedBookedSlots = validationResult.bookedSlotsOnDate
      ? Array.from(new Set([...validationResult.bookedSlotsOnDate, timeSlot]))
      : [timeSlot];

    emitSocketEvents('appointment:created', appointment, [
      `doctor_${rawDoctorId}`,
      `patient_${rawPatientId}`,
      'admin_room'
    ]);

    // Broadcast slot:booked & doctor:availability_updated to immediately lock & disable the 10-minute button across all connected users
    if (global.io) {
      // 1. Specific slot:booked broadcast
      global.io.emit('slot:booked', {
        doctorId: rawDoctorId,
        date: targetDateStr,
        slotTime: timeSlot,
        bookedBy: patientData?.name || 'Patient',
        bookedSlots: updatedBookedSlots,
        timestamp: new Date().toISOString()
      });

      // 2. Doctor availability update
      global.io.emit('doctor:availability_updated', {
        doctorId: rawDoctorId,
        date: targetDateStr,
        timeSlot,
        isBooked: true,
        bookedSlots: updatedBookedSlots,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(201).json(appointment);
  } catch (error) {
    console.error('Error in createAppointment:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get appointments for logged in patient
export const getPatientAppointments = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointments = await Appointment.find({ patientId: req.user._id })
        .populate('doctorId', 'name email specialization phone photo degree qualification consultationFee')
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

// @desc Get appointments for logged in doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointments = await Appointment.find({ doctorId: req.user._id })
        .populate('patientId', 'name email phone age gender bloodGroup photo dob address')
        .sort({ createdAt: -1 });
      return res.json(appointments);
    } else {
      const appointments = memoryStore.getDoctorAppointments(req.user._id);
      return res.json(appointments);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update appointment status & emit real-time WebSocket events
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    let updatedAppointment;

    if (global.isMongoConnected) {
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      appointment.status = status;
      await appointment.save();

      updatedAppointment = await Appointment.findById(id)
        .populate('patientId', 'name email phone gender age bloodGroup photo dob address')
        .populate('doctorId', 'name email phone specialization consultationFee photo degree qualification');
    } else {
      updatedAppointment = memoryStore.updateAppointmentStatus(id, status);
      if (!updatedAppointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    const rawDoctorId = typeof updatedAppointment.doctorId === 'object' ? updatedAppointment.doctorId._id : updatedAppointment.doctorId;
    const rawPatientId = typeof updatedAppointment.patientId === 'object' ? updatedAppointment.patientId._id : updatedAppointment.patientId;

    // Real-time broadcast
    emitSocketEvents('appointment:updated', updatedAppointment, [
      `doctor_${rawDoctorId}`,
      `patient_${rawPatientId}`,
      'admin_room'
    ]);

    emitSocketEvents('appointment:status_changed', {
      appointmentId: updatedAppointment._id,
      status: updatedAppointment.status,
      patientId: rawPatientId,
      doctorId: rawDoctorId,
      updatedAt: new Date().toISOString()
    }, [
      `doctor_${rawDoctorId}`,
      `patient_${rawPatientId}`,
      'admin_room'
    ]);

    return res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Process UPI Payment & Emit Live Update
export const payForAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { upiId, transactionId, amount } = req.body;

    let updatedAppointment;

    if (global.isMongoConnected) {
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      appointment.paymentStatus = 'Paid';
      appointment.paymentDetails = {
        upiId: upiId || 'krishna4u.rn@oksbi',
        transactionId: transactionId || ('UPI' + Date.now()),
        amount: amount || appointment.amount || 150,
        paidAt: new Date()
      };
      if (appointment.status === 'Pending') appointment.status = 'Confirmed';
      await appointment.save();

      updatedAppointment = await Appointment.findById(id)
        .populate('patientId', 'name email phone gender age bloodGroup photo dob address')
        .populate('doctorId', 'name email phone specialization consultationFee photo degree qualification');
    } else {
      updatedAppointment = memoryStore.updateAppointmentPayment(id, { upiId, transactionId, amount });
      if (!updatedAppointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    const rawDoctorId = typeof updatedAppointment.doctorId === 'object' ? updatedAppointment.doctorId._id : updatedAppointment.doctorId;
    const rawPatientId = typeof updatedAppointment.patientId === 'object' ? updatedAppointment.patientId._id : updatedAppointment.patientId;

    emitSocketEvents('appointment:updated', updatedAppointment, [
      `doctor_${rawDoctorId}`,
      `patient_${rawPatientId}`,
      'admin_room'
    ]);

    return res.json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Doctor Booked Slots for Live Availability Sync
export const getDoctorBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: 'doctorId and date are required' });
    }

    const targetDateStr = date.split('T')[0];
    let appointments = [];

    if (global.isMongoConnected) {
      appointments = await Appointment.find({
        doctorId,
        status: { $ne: 'Cancelled' }
      });
    } else {
      appointments = memoryStore.getAllAppointments().filter((a) => {
        const dId = typeof a.doctorId === 'object' ? a.doctorId?._id : a.doctorId;
        return String(dId) === String(doctorId) && a.status !== 'Cancelled';
      });
    }

    const bookedSlots = appointments
      .filter((app) => {
        const appDateStr = typeof app.date === 'string' ? app.date.split('T')[0] : new Date(app.date).toISOString().split('T')[0];
        return appDateStr === targetDateStr;
      })
      .map((app) => app.timeSlot || app.time);

    return res.json({
      doctorId,
      date: targetDateStr,
      bookedSlots: [...new Set(bookedSlots)],
      allSlots: ALL_10MIN_SLOTS,
      morningSlots: MORNING_SLOTS,
      afternoonSlots: AFTERNOON_SLOTS,
      eveningSlots: EVENING_SLOTS,
      totalSlots: ALL_10MIN_SLOTS.length,
      availableSlotsCount: ALL_10MIN_SLOTS.filter(s => !bookedSlots.some(b => isSlotConflict(b, s))).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
