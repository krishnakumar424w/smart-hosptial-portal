import Medicine from '../models/Medicine.js';
import { memoryStore } from '../config/memoryStore.js';

// @desc Get all hospital medicines with stock status
export const getAllMedicines = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const medicines = await Medicine.find().sort({ prescriptionCount: -1, quantity: -1 });
      const mapped = medicines.map((m) => {
        const doc = m.toObject();
        return {
          ...doc,
          isOutOfStock: (doc.quantity || 0) <= 0,
          isLowStock: (doc.quantity || 0) > 0 && (doc.quantity || 0) <= 20
        };
      });
      return res.json(mapped);
    } else {
      const medicines = memoryStore.getAllMedicines();
      return res.json(medicines);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Search medicines for doctor autocomplete (prefix filtering + usage frequency sort)
export const searchMedicines = async (req, res) => {
  try {
    const { query } = req.query;
    if (global.isMongoConnected) {
      const q = (query || '').toLowerCase().trim();
      let filter = {};
      if (q) {
        filter = {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { category: { $regex: q, $options: 'i' } }
          ]
        };
      }
      const medicines = await Medicine.find(filter).sort({ prescriptionCount: -1, quantity: -1 });
      const mapped = medicines.map((m) => {
        const doc = m.toObject();
        return {
          ...doc,
          isOutOfStock: (doc.quantity || 0) <= 0,
          isLowStock: (doc.quantity || 0) > 0 && (doc.quantity || 0) <= 20
        };
      });
      return res.json(mapped);
    } else {
      const medicines = memoryStore.searchMedicines(query);
      return res.json(medicines);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add new medicine to hospital inventory
export const addMedicine = async (req, res) => {
  try {
    const { name, category, quantity, unit, dosage, pricePerUnit, expiryDate, supplier } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Medicine name is required' });
    }

    if (global.isMongoConnected) {
      const medicine = await Medicine.create({
        name: name.trim(),
        category: category || 'General',
        quantity: Number(quantity) || 50,
        unit: unit || 'Tablets',
        dosage: dosage || '1 tablet',
        pricePerUnit: Number(pricePerUnit) || 10,
        expiryDate: expiryDate || '2027-12-31',
        supplier: supplier || 'Hospital Central Pharmacy'
      });
      return res.status(201).json(medicine);
    } else {
      const medicine = memoryStore.addMedicine({
        name: name.trim(),
        category: category || 'General',
        quantity: Number(quantity) || 50,
        unit: unit || 'Tablets',
        dosage: dosage || '1 tablet',
        pricePerUnit: Number(pricePerUnit) || 10,
        expiryDate: expiryDate || '2027-12-31',
        supplier: supplier || 'Hospital Central Pharmacy'
      });
      return res.status(201).json(medicine);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update medicine details / Restock stock quantity
export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (global.isMongoConnected) {
      const updated = await Medicine.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: Date.now() },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: 'Medicine not found' });
      }
      return res.json(updated);
    } else {
      const updated = memoryStore.updateMedicine(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: 'Medicine not found' });
      }
      return res.json(updated);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete medicine from hospital inventory
export const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    if (global.isMongoConnected) {
      const removed = await Medicine.findByIdAndDelete(id);
      if (!removed) {
        return res.status(404).json({ message: 'Medicine not found' });
      }
      return res.json({ message: 'Medicine removed successfully from inventory' });
    } else {
      const success = memoryStore.deleteMedicine(id);
      if (!success) {
        return res.status(404).json({ message: 'Medicine not found' });
      }
      return res.json({ message: 'Medicine removed successfully from inventory' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
