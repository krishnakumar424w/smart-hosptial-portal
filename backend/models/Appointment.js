import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  symptoms: { type: String, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Completed', 'Failed'], 
    default: 'Pending' 
  },
  amount: { type: Number, default: 150 },
  paymentDetails: {
    upiId: String,
    transactionId: String,
    amount: Number,
    paidAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Appointment', appointmentSchema);