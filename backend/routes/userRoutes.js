import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getAllDoctors,
  getAllUsers,
  deleteUser
} from '../controllers/userController.js';

const router = express.Router();

// Get all doctors (Public/Patient)
router.get('/doctors', getAllDoctors);

// Get all users (Admin only)
router.get('/', protect, admin, getAllUsers);

// Delete user (Admin only - allows deletion of any user, doctor, or account)
router.delete('/:id', protect, admin, deleteUser);

export default router;

