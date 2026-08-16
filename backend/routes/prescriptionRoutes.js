import express from 'express';
import Prescription from '../models/Prescription.js';
import { protect } from '../middleware/authMiddleware.js';
import { memoryStore } from '../config/memoryStore.js';

const router = express.Router();

// Create prescription (Doctor only)
router.post('/', protect, async (req, res) => {
  try {
    const { appointmentId, patientId, medicines, instructions, notes, diagnosis, patientName } = req.body;
    let prescription;
    const normalizedMedicines = (medicines || []).map((medicine) => ({
      ...medicine,
      duration: medicine.duration || medicine.dosage || 'As advised'
    }));

    if (global.isMongoConnected) {
      prescription = await Prescription.create({
        appointmentId,
        patientId,
        doctorId: req.user._id,
        patientName,
        medicines: normalizedMedicines,
        diagnosis,
        notes: notes || instructions,
        instructions: instructions || notes
      });
    } else {
      prescription = memoryStore.createPrescription({
        appointmentId,
        doctorId: req.user._id,
        patientId,
        patientName,
        medicines: normalizedMedicines,
        diagnosis,
        notes: notes || instructions
      });
    }
    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: 'Error creating prescription', error: error.message });
  }
});

// Fetch patient's prescriptions
router.get('/patient', protect, async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const prescriptions = await Prescription.find({ patientId: req.user._id }).populate('doctorId', 'name specialization degree consultationFee');
      return res.json(prescriptions);
    } else {
      const prescriptions = memoryStore.getPatientPrescriptions(req.user._id);
      return res.json(prescriptions);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching prescriptions', error: error.message });
  }
});

// Pay for prescription bill using UPI
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const { upiId, transactionId, amount } = req.body;
    if (global.isMongoConnected) {
      const prescription = await Prescription.findById(req.params.id);
      if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
      prescription.paymentStatus = 'Paid';
      prescription.paymentDetails = {
        upiId: upiId || 'krishna4u.rn@oksbi',
        transactionId: transactionId || ('TXN' + Date.now()),
        amount: amount || prescription.bill?.totalAmount || 550,
        paidAt: new Date()
      };
      await prescription.save();
      return res.json(prescription);
    } else {
      const updated = memoryStore.updatePrescriptionPayment(req.params.id, { upiId, transactionId, amount });
      if (!updated) return res.status(404).json({ message: 'Prescription not found' });
      return res.json(updated);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error paying prescription bill', error: error.message });
  }
});

export default router;
