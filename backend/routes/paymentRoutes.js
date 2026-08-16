import express from 'express';
import { verifyUpiPayment, createPaymentIntent } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mock Payment Intent Generation (Public or Protected)
router.post('/create-intent', createPaymentIntent);

// Verify UPI Payment with 12-Digit UTR
router.post('/verify-upi', verifyUpiPayment);

export default router;
