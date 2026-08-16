import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, default: 'General' },
  quantity: { type: Number, required: true, default: 100 }, // Available units/tablets
  unit: { type: String, default: 'Tablets' },
  dosage: { type: String, default: '1 tablet' },
  pricePerUnit: { type: Number, default: 10 },
  expiryDate: { type: String, default: '2027-12-31' },
  prescriptionCount: { type: Number, default: 0 },
  supplier: { type: String, default: 'Hospital Central Pharmacy' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Medicine', medicineSchema);
