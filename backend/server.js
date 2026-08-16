import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { seedAdminAccount } from './controllers/authController.js';

import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);
global.io = io;

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  socket.on('join_patient', (patientId) => {
    if (patientId) {
      socket.join(`patient_${patientId}`);
      console.log(`Socket ${socket.id} joined room patient_${patientId}`);
    }
  });

  socket.on('join_doctor', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
      console.log(`Socket ${socket.id} joined room doctor_${doctorId}`);
    }
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log(`Socket ${socket.id} joined admin_room`);
  });

  // Client-initiated appointment creation broadcast
  socket.on('appointment:create', (appointmentData) => {
    if (appointmentData) {
      const dId = typeof appointmentData.doctorId === 'object' ? appointmentData.doctorId?._id : appointmentData.doctorId;
      const pId = typeof appointmentData.patientId === 'object' ? appointmentData.patientId?._id : appointmentData.patientId;
      const targetDate = typeof appointmentData.date === 'string' ? appointmentData.date.split('T')[0] : appointmentData.date;
      const slotTime = appointmentData.timeSlot || appointmentData.time;

      io.emit('appointment:created', appointmentData);
      if (dId) {
        io.to(`doctor_${dId}`).emit('appointment:created', appointmentData);
      }
      if (pId) {
        io.to(`patient_${pId}`).emit('appointment:created', appointmentData);
      }

      // Real-time slot locking broadcast to all patients & doctors
      io.emit('slot:booked', {
        doctorId: dId,
        date: targetDate,
        slotTime,
        bookedBy: appointmentData.patient?.name || 'Patient',
        timestamp: new Date().toISOString()
      });

      io.emit('doctor:availability_updated', {
        doctorId: dId,
        date: targetDate,
        timeSlot: slotTime,
        isBooked: true,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Client-initiated explicit slot lock / booked broadcast
  socket.on('slot:book', (payload) => {
    if (payload) {
      const dId = typeof payload.doctorId === 'object' ? payload.doctorId?._id : payload.doctorId;
      const targetDate = typeof payload.date === 'string' ? payload.date.split('T')[0] : payload.date;
      const slotTime = payload.slotTime || payload.timeSlot;

      io.emit('slot:booked', {
        doctorId: dId,
        date: targetDate,
        slotTime,
        bookedBy: payload.bookedBy || 'Patient',
        timestamp: new Date().toISOString()
      });

      io.emit('doctor:availability_updated', {
        doctorId: dId,
        date: targetDate,
        timeSlot: slotTime,
        isBooked: true,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Client-initiated appointment status update broadcast
  socket.on('appointment:status_update', (payload) => {
    if (payload && payload.appointment) {
      io.emit('appointment:updated', payload.appointment);
      io.emit('appointment:status_changed', {
        appointmentId: payload.appointment._id,
        status: payload.appointment.status,
        patientId: payload.appointment.patientId,
        doctorId: payload.appointment.doctorId
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/medicines', medicineRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongoConnected: !!global.isMongoConnected });
});

// Serve Vite dev middleware in development, or client dist static in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
    appType: 'spa',
    root: path.resolve(__dirname, '../client')
  });
  app.use(vite.middlewares);
} else {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

const PORT = 3000;

const startServer = async () => {
  await connectDB();
  await seedAdminAccount();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running with WebSocket on http://0.0.0.0:${PORT}`);
  });
};

startServer();
