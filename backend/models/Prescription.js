import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String, required: true }, // e.g., "1-0-1"
      duration: { type: String, required: true }, // e.g., "5 days"
      instructions: { type: String } // e.g., "After meal"
    }
  ],
  diagnosis: { type: String, required: true },
  notes: { type: String },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  paymentDetails: {
    upiId: String,
    transactionId: String,
    amount: Number,
    paidAt: Date
  },
  bill: {
    consultationFee: { type: Number, default: 150 },
    pharmacyFee: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 50 },
    totalAmount: { type: Number, default: 200 },
    isGenerated: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Prescription', prescriptionSchema);