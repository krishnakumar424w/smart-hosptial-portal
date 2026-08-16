import mongoose from 'mongoose';

const medicineReminderSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true },
  reminderTimes: [{ type: String, required: true }], // e.g., ["08:00 AM", "08:00 PM"]
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
});

export default mongoose.model('MedicineReminder', medicineReminderSchema);