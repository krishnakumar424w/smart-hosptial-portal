import express from 'express';
import { searchMedicineInformation } from '../controllers/medicineController.js';

const router = express.Router();

// Search medicine medical uses, side effects, and dosage via Google Custom Search API / Medical KB
router.post('/google-search', searchMedicineInformation);
router.get('/google-search', searchMedicineInformation);

export default router;
