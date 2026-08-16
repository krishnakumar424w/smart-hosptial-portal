import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { memoryStore } from '../config/memoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_hospital_jwt_secret_key_12345';

// Predefined Master Admin Credentials
export const PREDEFINED_ADMIN = {
  email: 'admin@smarthospital.com',
  password: 'AdminPassword123!',
  role: 'admin'
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Seed / Ensure predefined admin account is present in database or memory
export const seedAdminAccount = async () => {
  try {
    const adminEmail = PREDEFINED_ADMIN.email.toLowerCase();
    const hashedPassword = await bcrypt.hash(PREDEFINED_ADMIN.password, 10);

    if (global.isMongoConnected) {
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        await User.create({
          name: 'Hospital Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          phone: '555-0177',
          address: 'Smart Hospital Administration Block, NY'
        });
        console.log('[Auth] Predefined Admin account seeded successfully into MongoDB.');
      } else {
        existingAdmin.role = 'admin';
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
      }
    } else {
      const existingMem = memoryStore.findUserByEmail(adminEmail);
      if (!existingMem) {
        memoryStore.createUser({
          name: 'Hospital Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          phone: '555-0177',
          address: 'Smart Hospital Administration Block, NY'
        });
      }
    }
  } catch (err) {
    console.error('[Auth] Failed to seed predefined admin account:', err);
  }
};

// @desc Register User (Admin registration is strictly blocked; defaults strictly to patient)
export const registerUser = async (req, res) => {
  const { name, email, password, role, phone, specialization, degree, experience, age, gender, dob, bloodGroup, address, photo } = req.body;
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const requestedRole = (role || '').toString().trim().toLowerCase();

    // 1. Strict Restriction: Block any new registration trying to create an ADMIN role or using admin email
    if (requestedRole === 'admin' || normalizedEmail === PREDEFINED_ADMIN.email.toLowerCase()) {
      return res.status(403).json({
        message: 'Admin account creation is strictly restricted. Only the predefined system administrator is permitted.'
      });
    }

    // 2. Strict Default: New registrations default strictly to patient (or doctor if explicit medical info is provided)
    const safeRole = requestedRole === 'doctor' ? 'doctor' : 'patient';

    if (global.isMongoConnected) {
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) return res.status(400).json({ message: 'User already exists with this email address' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: safeRole,
        phone,
        specialization: safeRole === 'doctor' ? specialization : undefined,
        degree: safeRole === 'doctor' ? degree : undefined,
        experience: safeRole === 'doctor' ? experience : undefined,
        age,
        gender,
        dob,
        bloodGroup,
        address,
        photo
      });

      return res.status(201).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          specialization: user.specialization,
          degree: user.degree,
          experience: user.experience,
          age: user.age,
          gender: user.gender,
          dob: user.dob,
          bloodGroup: user.bloodGroup,
          address: user.address,
          photo: user.photo
        },
        token: generateToken(user._id, user.role)
      });
    } else {
      const existingUser = memoryStore.findUserByEmail(normalizedEmail);
      if (existingUser) return res.status(400).json({ message: 'User already exists with this email address' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = memoryStore.createUser({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: safeRole,
        phone,
        specialization: safeRole === 'doctor' ? specialization : undefined,
        degree: safeRole === 'doctor' ? degree : undefined,
        experience: safeRole === 'doctor' ? experience : undefined,
        age,
        gender,
        dob,
        bloodGroup,
        address,
        photo
      });

      return res.status(201).json({
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          specialization: newUser.specialization,
          degree: newUser.degree,
          experience: newUser.experience,
          age: newUser.age,
          gender: newUser.gender,
          dob: newUser.dob,
          bloodGroup: newUser.bloodGroup,
          address: newUser.address,
          photo: newUser.photo
        },
        token: generateToken(newUser._id, newUser.role)
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Login User (Restricts Admin login strictly to admin@smarthospital.com)
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const inputEmail = (email || '').trim().toLowerCase();
    const isAdminEmail = inputEmail === PREDEFINED_ADMIN.email.toLowerCase();

    let user;
    if (global.isMongoConnected) {
      user = await User.findOne({ email: inputEmail });
    } else {
      user = memoryStore.findUserByEmail(inputEmail);
    }

    // Direct verification for predefined Admin credentials
    if (isAdminEmail && password === PREDEFINED_ADMIN.password) {
      const adminId = user ? user._id : '65f000000000000000000004';
      const adminUser = user ? (user.toObject ? user.toObject() : { ...user }) : {
        _id: adminId,
        name: 'Hospital Administrator',
        email: PREDEFINED_ADMIN.email,
        role: 'admin',
        phone: '555-0177'
      };
      delete adminUser.password;
      return res.json({
        user: adminUser,
        token: generateToken(adminId, 'admin')
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userRole = (user.role || '').toLowerCase();

    // Restricted Admin Login: Reject any email trying to log in with Admin role other than admin@smarthospital.com
    if (userRole === 'admin') {
      if (!isAdminEmail) {
        return res.status(403).json({
          message: 'Access Denied. Only the predefined system administrator (admin@smarthospital.com) is authorized for Admin portal access.'
        });
      }
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return res.json({
      user: userObj,
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current user profile
export const getUserProfile = async (req, res) => {
  try {
    if (global.isMongoConnected) {
      const user = await User.findById(req.user._id).select('-password');
      if (user) {
        return res.json(user);
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    } else {
      const user = memoryStore.getUserById(req.user._id);
      if (user) {
        return res.json(user);
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, age, gender, dob, bloodGroup, address, photo, specialization, degree, experience } = req.body;

    if (global.isMongoConnected) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.name = name ?? user.name;
      user.phone = phone ?? user.phone;
      user.age = age ?? user.age;
      user.gender = gender ?? user.gender;
      user.dob = dob ?? user.dob;
      user.bloodGroup = bloodGroup ?? user.bloodGroup;
      user.address = address ?? user.address;
      user.photo = photo ?? user.photo;
      user.specialization = specialization ?? user.specialization;
      user.degree = degree ?? user.degree;
      user.experience = experience ?? user.experience;

      const updatedUser = await user.save();
      const userObj = updatedUser.toObject();
      delete userObj.password;
      return res.json(userObj);
    } else {
      const updatedUser = memoryStore.updateUserProfile(req.user._id, {
        name,
        phone,
        age,
        gender,
        dob,
        bloodGroup,
        address,
        photo,
        specialization,
        degree,
        experience
      });
      return res.json(updatedUser);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
