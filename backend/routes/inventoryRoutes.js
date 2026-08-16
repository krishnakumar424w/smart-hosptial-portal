import express from 'express';
import {
  getAllMedicines,
  searchMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public / Doctor / Admin search & list
router.get('/', protect, getAllMedicines);
router.get('/search', protect, searchMedicines);

// Admin / Doctor stock management
router.post('/', protect, authorize('admin'), addMedicine);
router.put('/:id', protect, updateMedicine);
router.delete('/:id', protect, authorize('admin'), deleteMedicine);

export default router;
