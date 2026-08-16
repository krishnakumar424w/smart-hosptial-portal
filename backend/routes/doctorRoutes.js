import express from 'express';
import { getDoctorAppointments, createPrescription, searchMedicines } from '../controllers/doctorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/appointments', protect, authorizeRoles('doctor'), getDoctorAppointments);
router.post('/prescriptions', protect, authorizeRoles('doctor'), createPrescription);
router.get('/medicines', protect, searchMedicines);

export default router;
