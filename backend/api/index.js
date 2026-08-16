import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from '../config/db.js';

import authRoutes from '../routes/authRoutes.js';
import patientRoutes from '../routes/patientRoutes.js';
import doctorRoutes from '../routes/doctorRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import appointmentRoutes from '../routes/appointmentRoutes.js';
import prescriptionRoutes from '../routes/prescriptionRoutes.js';
import inventoryRoutes from '../routes/inventoryRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import medicineRoutes from '../routes/medicineRoutes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/medicines', medicineRoutes);

app.get('/api/health', async (req, res) => {
  await connectDB();

  res.json({
    status: 'ok',
    mongoConnected: !!global.isMongoConnected
  });
});

await connectDB();

export default app;