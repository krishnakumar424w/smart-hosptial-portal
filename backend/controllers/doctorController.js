import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import { memoryStore } from '../config/memoryStore.js';

// @desc Get Doctor Appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const appointments = await Appointment.find({ doctorId: req.user._id })
        .populate('patientId', 'name age gender phone bloodGroup email address photo')
        .sort({ date: 1 });
      return res.json(appointments);
    } else {
      const appointments = memoryStore.getDoctorAppointments(req.user._id);
      return res.json(appointments);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add Prescription & Emit WebSocket Event
export const createPrescription = async (req, res) => {
  const { appointmentId, patientId, patientName, medicines, diagnosis, notes } = req.body;
  try {
    let prescription;
    if (global.isMongoConnected) {
      const consultationFee = req.user.consultationFee || 150;
      const registrationFee = 50;
      let pharmacyFee = 0;
      const billItems = [
        { name: `Dr. Consultation (${req.user.specialization || 'Specialist'})`, cost: consultationFee, type: 'consultation' }
      ];

      const processedMedicines = (medicines || []).map((m) => {
        const tabs = Number(m.tablets) || 10;
        const pricePerUnit = m.pricePerUnit || 15;
        const totalCost = m.totalCost || Math.max(50, tabs * pricePerUnit);
        pharmacyFee += totalCost;
        billItems.push({
          name: `${m.name || 'Medicine'} (${tabs} tabs)`,
          cost: totalCost,
          type: 'pharmacy'
        });
        return {
          ...m,
          duration: m.duration || m.dosage || 'As advised',
          tablets: tabs,
          pricePerUnit,
          totalCost
        };
      });

      billItems.push({ name: 'Hospital Processing & Registration', cost: registrationFee, type: 'registration' });
      const totalAmount = consultationFee + pharmacyFee + registrationFee;

      prescription = await Prescription.create({
        appointmentId,
        doctorId: req.user._id,
        patientId,
        patientName,
        medicines: processedMedicines,
        diagnosis,
        notes,
        paymentStatus: 'Pending',
        bill: {
          consultationFee,
          pharmacyFee,
          registrationFee,
          totalAmount,
          isGenerated: true,
          items: billItems
        }
      });

      // Mark appointment as Completed
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });
    } else {
      prescription = memoryStore.createPrescription({
        appointmentId,
        doctorId: req.user._id,
        patientId,
        patientName,
        medicines,
        diagnosis,
        notes
      });
    }

    // Emit real-time WebSocket event to connected patient(s)
    if (global.io) {
      global.io.emit('prescription_created', prescription);
      global.io.emit('appointment:updated', { _id: appointmentId, status: 'Completed', patientId, doctorId: req.user._id });
      global.io.emit('appointment:status_changed', { appointmentId, status: 'Completed', patientId, doctorId: req.user._id });
      if (patientId) {
        global.io.to(`patient_${patientId}`).emit('new_prescription', prescription);
        global.io.to(`patient_${patientId}`).emit('appointment:updated', { _id: appointmentId, status: 'Completed', patientId, doctorId: req.user._id });
        global.io.to(`patient_${patientId}`).emit('appointment:status_changed', { appointmentId, status: 'Completed', patientId, doctorId: req.user._id });
      }
      global.io.to(`doctor_${req.user._id}`).emit('appointment:updated', { _id: appointmentId, status: 'Completed', patientId, doctorId: req.user._id });
    }

    return res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Search medicines for prescription auto-suggest
export const searchMedicines = async (req, res) => {
  try {
    const { query } = req.query;
    const medicines = memoryStore.searchMedicines(query);
    return res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
