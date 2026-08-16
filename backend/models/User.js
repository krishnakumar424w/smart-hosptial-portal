import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['patient', 'doctor', 'admin'], 
    default: 'patient' 
  },
  phone: { type: String, required: true },
  
  // Specific to Patients
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup: { type: String },

  // Specific to Doctors
  specialization: { type: String },
  qualification: { type: String },
  consultationFee: { type: Number },
  availableDays: [{ type: String }], // e.g., ['Monday', 'Wednesday']
  availableTimeSlots: [{ type: String }], // e.g., ['10:00 AM', '11:00 AM']

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);