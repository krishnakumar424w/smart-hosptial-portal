import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { memoryStore } from '../config/memoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_hospital_jwt_secret_key_12345';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (global.isMongoConnected) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        req.user = memoryStore.getUserById(decoded.id);
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware - allow the designated hospital admin account while still restricting
// creation of new admin accounts to the predefined system administrator email.
export const admin = (req, res, next) => {
  const userRole = (req.user?.role || '').toLowerCase();
  const userEmail = (req.user?.email || '').toLowerCase();

  if (userRole === 'admin' || userEmail === 'admin@smarthospital.com') {
    return next();
  }

  return res.status(403).json({
    message: 'Not authorized. Admin portal access is restricted to the hospital administrator.'
  });
};
