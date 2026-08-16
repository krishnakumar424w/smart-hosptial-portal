import User from '../models/User.js';
import { memoryStore } from '../config/memoryStore.js';

// @desc Get all doctors (Public / Patient)
// @route GET /api/users/doctors
export const getAllDoctors = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const doctors = await User.find({ role: 'doctor' }).select('-password');
      return res.status(200).json(doctors);
    } else {
      const doctors = memoryStore.getDoctors();
      return res.status(200).json(doctors);
    }
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ success: false, message: 'Error fetching doctors', error: error.message });
  }
};

// @desc Get all users (Admin only)
// @route GET /api/users
export const getAllUsers = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const users = await User.find().select('-password');
      return res.status(200).json(users);
    } else {
      const users = memoryStore.getAllUsers();
      return res.status(200).json(users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

// @desc Delete user (Admin only - removes any user, doctor, or account)
// @route DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (global.isMongoConnected) {
      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await User.findByIdAndDelete(userId);
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } else {
      const userToDelete = memoryStore.getUserById(userId);
      if (!userToDelete) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const deleted = memoryStore.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'User not found or could not be removed' });
      }
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
};
