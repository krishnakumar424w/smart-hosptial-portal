import bcrypt from 'bcryptjs';

const defaultPasswordHash = bcrypt.hashSync('password123', 10);
const defaultAdminPasswordHash = bcrypt.hashSync('AdminPassword123!', 10);

export const PREDEFINED_ADMIN = {
  email: 'admin@smarthospital.com',
  password: 'AdminPassword123!',
  role: 'admin'
};

const users = [
  {
    _id: '65f000000000000000000001',
    name: 'John Doe',
    email: 'patient@hospital.com',
    password: defaultPasswordHash,
    role: 'patient',
    phone: '555-0199',
    age: 32,
    gender: 'Male',
    bloodGroup: 'O+',
    dob: '1994-05-15',
    address: '123 Health Ave, Suite 4B, New York, NY',
    photo: '',
    createdAt: new Date().toISOString()
  },
  {
    _id: '65f000000000000000000002',
    name: 'Dr. Sarah Smith',
    email: 'doctor@hospital.com',
    password: defaultPasswordHash,
    role: 'doctor',
    phone: '555-0188',
    specialization: 'Cardiology',
    degree: 'MBBS, MD (Cardiology)',
    qualification: 'MBBS, MD (Cardiology)',
    experience: '12 years',
    age: 41,
    dob: '1985-08-22',
    bloodGroup: 'A+',
    consultationFee: 150,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    availableTimeSlots: ['10:00 AM', '02:00 PM'],
    photo: '',
    createdAt: new Date().toISOString()
  },
  {
    _id: '65f000000000000000000003',
    name: 'Dr. Robert Chen',
    email: 'robert.chen@hospital.com',
    password: defaultPasswordHash,
    role: 'doctor',
    phone: '555-0166',
    specialization: 'General Medicine',
    degree: 'MBBS, FACP',
    qualification: 'MBBS, FACP',
    experience: '9 years',
    age: 38,
    dob: '1988-11-04',
    bloodGroup: 'B+',
    consultationFee: 100,
    availableDays: ['Tuesday', 'Thursday', 'Saturday'],
    availableTimeSlots: ['09:00 AM', '01:00 PM', '04:00 PM'],
    photo: '',
    createdAt: new Date().toISOString()
  },
  {
    _id: '65f000000000000000000004',
    name: 'Hospital Administrator',
    email: 'admin@smarthospital.com',
    password: defaultAdminPasswordHash,
    role: 'admin',
    phone: '555-0177',
    photo: '',
    createdAt: new Date().toISOString()
  }
];

const appointments = [
  {
    _id: '65f000000000000000000010',
    patientId: '65f000000000000000000001',
    patient: {
      _id: '65f000000000000000000001',
      name: 'John Doe',
      email: 'patient@hospital.com',
      phone: '555-0199',
      age: 32,
      gender: 'Male',
      bloodGroup: 'O+'
    },
    doctorId: '65f000000000000000000002',
    doctor: {
      _id: '65f000000000000000000002',
      name: 'Dr. Sarah Smith',
      email: 'doctor@hospital.com',
      specialization: 'Cardiology'
    },
    date: '2026-08-15',
    timeSlot: '10:00 - 10:10 AM',
    time: '10:00 - 10:10 AM',
    symptoms: 'Chest tightness and shortness of breath',
    status: 'Pending',
    paymentStatus: 'Pending',
    amount: 150,
    createdAt: new Date().toISOString()
  }
];

const prescriptions = [
  {
    _id: '65f000000000000000000020',
    appointmentId: '65f000000000000000000010',
    doctorId: '65f000000000000000000002',
    doctor: {
      _id: '65f000000000000000000002',
      name: 'Dr. Sarah Smith',
      specialization: 'Cardiology',
      phone: '555-0188',
      degree: 'MBBS, MD (Cardiology)',
      consultationFee: 150
    },
    patientId: '65f000000000000000000001',
    patientName: 'John Doe',
    diagnosis: 'Mild Hypertension',
    notes: 'Rest, avoid sodium and perform moderate walking',
    medicines: [
      {
        name: 'Aspirin',
        dosage: '100mg',
        timing: { morning: true, afternoon: false, night: true },
        tablets: 14,
        pricePerUnit: 15,
        totalCost: 250,
        instructions: 'Take daily after meal'
      },
      {
        name: 'Atorvastatin',
        dosage: '10mg',
        timing: { morning: false, afternoon: false, night: true },
        tablets: 7,
        pricePerUnit: 10,
        totalCost: 100,
        instructions: 'Take at bedtime'
      }
    ],
    bill: {
      consultationFee: 150,
      pharmacyFee: 350,
      registrationFee: 50,
      totalAmount: 550,
      isGenerated: true,
      items: [
        { name: 'Dr. Consultation (Cardiology)', cost: 150, type: 'consultation' },
        { name: 'Aspirin 100mg (14 tabs)', cost: 250, type: 'pharmacy' },
        { name: 'Atorvastatin 10mg (7 tabs)', cost: 100, type: 'pharmacy' },
        { name: 'Hospital Processing & Registration', cost: 50, type: 'registration' }
      ]
    },
    paymentStatus: 'Pending',
    createdAt: new Date().toISOString()
  }
];

const medicinesInventory = [
  {
    _id: '65f000000000000000000101',
    name: 'Paracetamol 500mg',
    category: 'Analgesic / Antipyretic',
    quantity: 140,
    unit: 'Tablets',
    dosage: '1 tablet (500mg) after meals',
    pricePerUnit: 5,
    expiryDate: '2027-08-30',
    prescriptionCount: 88,
    supplier: 'Cipla Healthcare Ltd'
  },
  {
    _id: '65f000000000000000000102',
    name: 'Pantoprazole 40mg',
    category: 'Antacid / PPI',
    quantity: 95,
    unit: 'Tablets',
    dosage: '1 tablet (40mg) before breakfast',
    pricePerUnit: 12,
    expiryDate: '2027-04-15',
    prescriptionCount: 65,
    supplier: 'Sun Pharma Ltd'
  },
  {
    _id: '65f000000000000000000103',
    name: 'Dolo 650mg',
    category: 'Analgesic / Antipyretic',
    quantity: 160,
    unit: 'Tablets',
    dosage: '1 tablet (650mg) SOS for fever',
    pricePerUnit: 7,
    expiryDate: '2027-06-25',
    prescriptionCount: 92,
    supplier: 'Micro Labs Ltd'
  },
  {
    _id: '65f000000000000000000104',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    quantity: 80,
    unit: 'Capsules',
    dosage: '1 capsule (500mg) thrice daily',
    pricePerUnit: 15,
    expiryDate: '2026-12-20',
    prescriptionCount: 52,
    supplier: 'Alkem Laboratories'
  },
  {
    _id: '65f000000000000000000105',
    name: 'Azithromycin 500mg',
    category: 'Antibiotic',
    quantity: 45,
    unit: 'Tablets',
    dosage: '1 tablet (500mg) once daily',
    pricePerUnit: 25,
    expiryDate: '2027-01-10',
    prescriptionCount: 42,
    supplier: 'Zydus Lifesciences'
  },
  {
    _id: '65f000000000000000000106',
    name: 'Atorvastatin 20mg',
    category: 'Cardiology / Lipid Lowering',
    quantity: 60,
    unit: 'Tablets',
    dosage: '1 tablet (20mg) at bedtime',
    pricePerUnit: 18,
    expiryDate: '2027-09-18',
    prescriptionCount: 38,
    supplier: 'Torrent Pharmaceuticals'
  },
  {
    _id: '65f000000000000000000107',
    name: 'Metformin 500mg',
    category: 'Antidiabetic',
    quantity: 110,
    unit: 'Tablets',
    dosage: '1 tablet (500mg) with meals',
    pricePerUnit: 8,
    expiryDate: '2027-11-05',
    prescriptionCount: 49,
    supplier: 'USV Private Ltd'
  },
  {
    _id: '65f000000000000000000108',
    name: 'Cetirizine 10mg',
    category: 'Antihistamine / Allergy',
    quantity: 15,
    unit: 'Tablets',
    dosage: '1 tablet (10mg) at night',
    pricePerUnit: 6,
    expiryDate: '2026-10-12',
    prescriptionCount: 31,
    supplier: 'Dr. Reddy\'s Labs'
  },
  {
    _id: '65f000000000000000000109',
    name: 'Telmisartan 40mg',
    category: 'Cardiology / Hypertension',
    quantity: 75,
    unit: 'Tablets',
    dosage: '1 tablet (40mg) in the morning',
    pricePerUnit: 14,
    expiryDate: '2028-02-14',
    prescriptionCount: 35,
    supplier: 'Glenmark Pharmaceuticals'
  },
  {
    _id: '65f000000000000000000110',
    name: 'Ibuprofen 400mg',
    category: 'NSAID / Pain Relief',
    quantity: 18,
    unit: 'Tablets',
    dosage: '1 tablet (400mg) after food',
    pricePerUnit: 9,
    expiryDate: '2026-11-30',
    prescriptionCount: 28,
    supplier: 'Abbott Healthcare'
  },
  {
    _id: '65f000000000000000000111',
    name: 'Omeprazole 20mg',
    category: 'Antacid / Gastric',
    quantity: 85,
    unit: 'Capsules',
    dosage: '1 capsule (20mg) before meals',
    pricePerUnit: 10,
    expiryDate: '2027-05-19',
    prescriptionCount: 40,
    supplier: 'Cipla Healthcare Ltd'
  },
  {
    _id: '65f000000000000000000112',
    name: 'Vitamin D3 60K',
    category: 'Vitamins & Supplements',
    quantity: 0,
    unit: 'Softgels',
    dosage: '1 softgel weekly',
    pricePerUnit: 30,
    expiryDate: '2026-09-15',
    prescriptionCount: 22,
    supplier: 'Cadila Pharma'
  },
  {
    _id: '65f000000000000000000113',
    name: 'Zincovit Multivitamin',
    category: 'Vitamins & Minerals',
    quantity: 125,
    unit: 'Tablets',
    dosage: '1 tablet daily post lunch',
    pricePerUnit: 11,
    expiryDate: '2028-01-20',
    prescriptionCount: 46,
    supplier: 'Apex Laboratories'
  },
  {
    _id: '65f000000000000000000114',
    name: 'Ciprofloxacin 500mg',
    category: 'Antibiotic',
    quantity: 8,
    unit: 'Tablets',
    dosage: '1 tablet (500mg) twice daily',
    pricePerUnit: 16,
    expiryDate: '2026-10-25',
    prescriptionCount: 19,
    supplier: 'Bayer Healthcare'
  },
  {
    _id: '65f000000000000000000115',
    name: 'Losartan 50mg',
    category: 'Cardiology / Hypertension',
    quantity: 55,
    unit: 'Tablets',
    dosage: '1 tablet (50mg) daily',
    pricePerUnit: 13,
    expiryDate: '2027-07-11',
    prescriptionCount: 24,
    supplier: 'Torrent Pharmaceuticals'
  }
];

const medicineSearchIndex = new Set(medicinesInventory.map(m => m.name));

const reminders = [];

export const memoryStore = {
  findUserByEmail: (email) => {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  getUserById: (id) => {
    const user = users.find((u) => String(u._id) === String(id));
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
  getUserWithPasswordById: (id) => {
    return users.find((u) => String(u._id) === String(id)) || null;
  },
  createUser: (userData) => {
    const _id = '65f' + Math.random().toString(16).substring(2, 23).padEnd(21, '0');
    const newUser = {
      _id,
      ...userData,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
  },
  updateUserProfile: (id, profileData) => {
    const idx = users.findIndex((u) => String(u._id) === String(id));
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...profileData };
      const { password, ...userWithoutPassword } = users[idx];
      return userWithoutPassword;
    }
    return null;
  },
  getAllUsers: () => {
    return users.map(({ password, ...u }) => u);
  },
  getDoctors: () => {
    return users.filter((u) => u.role === 'doctor').map(({ password, ...u }) => u);
  },
  deleteUser: (id) => {
    const idx = users.findIndex((u) => String(u._id) === String(id));
    if (idx !== -1) {
      users.splice(idx, 1);
      return true;
    }
    return false;
  },

  createAppointment: ({ patientId, doctorId, date, timeSlot, symptoms }) => {
    const _id = '65f' + Math.random().toString(16).substring(2, 23).padEnd(21, '0');
    const patientObj = users.find((u) => String(u._id) === String(patientId));
    const doctorObj = users.find((u) => String(u._id) === String(doctorId));

    const newApp = {
      _id,
      patientId: patientObj ? { _id: patientObj._id, name: patientObj.name, email: patientObj.email, phone: patientObj.phone, age: patientObj.age, gender: patientObj.gender, bloodGroup: patientObj.bloodGroup } : patientId,
      patient: patientObj ? { _id: patientObj._id, name: patientObj.name, email: patientObj.email, phone: patientObj.phone, age: patientObj.age, gender: patientObj.gender, bloodGroup: patientObj.bloodGroup } : null,
      doctorId: doctorObj ? { _id: doctorObj._id, name: doctorObj.name, email: doctorObj.email, specialization: doctorObj.specialization, consultationFee: doctorObj.consultationFee || 150 } : doctorId,
      doctor: doctorObj ? { _id: doctorObj._id, name: doctorObj.name, email: doctorObj.email, specialization: doctorObj.specialization, consultationFee: doctorObj.consultationFee || 150 } : null,
      date,
      timeSlot,
      time: timeSlot,
      symptoms,
      status: 'Pending',
      paymentStatus: 'Pending',
      amount: doctorObj?.consultationFee || 150,
      createdAt: new Date().toISOString()
    };
    appointments.push(newApp);
    return newApp;
  },

  getPatientAppointments: (patientId) => {
    return appointments.filter((a) => {
      const pId = typeof a.patientId === 'object' ? a.patientId?._id : a.patientId;
      return String(pId) === String(patientId);
    });
  },

  getDoctorAppointments: (doctorId) => {
    return appointments.filter((a) => {
      const dId = typeof a.doctorId === 'object' ? a.doctorId?._id : a.doctorId;
      return String(dId) === String(doctorId);
    });
  },

  getAllAppointments: () => {
    return appointments;
  },

  updateAppointmentStatus: (id, status) => {
    const app = appointments.find((a) => String(a._id) === String(id));
    if (app) {
      app.status = status;
    }
    return app;
  },

  updateAppointmentPayment: (id, { upiId, transactionId, amount }) => {
    const app = appointments.find((a) => String(a._id) === String(id));
    if (app) {
      app.paymentStatus = 'Paid';
      app.paymentDetails = { 
        upiId: upiId || 'krishna4u.rn@oksbi', 
        transactionId: transactionId || ('UPI' + Date.now()),
        amount: amount || app.amount || 150,
        paidAt: new Date().toISOString() 
      };
      if (app.status === 'Pending') {
        app.status = 'Confirmed';
      }
    }
    return app;
  },

  getAllMedicines: () => {
    return medicinesInventory.map(m => ({
      ...m,
      isOutOfStock: (m.quantity || 0) <= 0,
      isLowStock: (m.quantity || 0) > 0 && (m.quantity || 0) <= 20
    }));
  },

  getMedicineById: (id) => {
    const med = medicinesInventory.find((m) => String(m._id) === String(id));
    if (!med) return null;
    return {
      ...med,
      isOutOfStock: (med.quantity || 0) <= 0,
      isLowStock: (med.quantity || 0) > 0 && (med.quantity || 0) <= 20
    };
  },

  addMedicine: (medicineData) => {
    const _id = '65f' + Math.random().toString(16).substring(2, 23).padEnd(21, '0');
    const newMed = {
      _id,
      name: medicineData.name || 'New Medicine',
      category: medicineData.category || 'General',
      quantity: Number(medicineData.quantity) || 50,
      unit: medicineData.unit || 'Tablets',
      dosage: medicineData.dosage || '1 tablet',
      pricePerUnit: Number(medicineData.pricePerUnit) || 10,
      expiryDate: medicineData.expiryDate || '2027-12-31',
      prescriptionCount: Number(medicineData.prescriptionCount) || 0,
      supplier: medicineData.supplier || 'Hospital Central Pharmacy',
      createdAt: new Date().toISOString()
    };
    medicinesInventory.push(newMed);
    medicineSearchIndex.add(newMed.name);
    return {
      ...newMed,
      isOutOfStock: newMed.quantity <= 0,
      isLowStock: newMed.quantity > 0 && newMed.quantity <= 20
    };
  },

  updateMedicine: (id, updateData) => {
    const idx = medicinesInventory.findIndex((m) => String(m._id) === String(id));
    if (idx !== -1) {
      medicinesInventory[idx] = {
        ...medicinesInventory[idx],
        ...updateData,
        quantity: updateData.quantity !== undefined ? Number(updateData.quantity) : medicinesInventory[idx].quantity,
        pricePerUnit: updateData.pricePerUnit !== undefined ? Number(updateData.pricePerUnit) : medicinesInventory[idx].pricePerUnit,
        prescriptionCount: updateData.prescriptionCount !== undefined ? Number(updateData.prescriptionCount) : medicinesInventory[idx].prescriptionCount,
        updatedAt: new Date().toISOString()
      };
      medicineSearchIndex.add(medicinesInventory[idx].name);
      const med = medicinesInventory[idx];
      return {
        ...med,
        isOutOfStock: med.quantity <= 0,
        isLowStock: med.quantity > 0 && med.quantity <= 20
      };
    }
    return null;
  },

  deleteMedicine: (id) => {
    const idx = medicinesInventory.findIndex((m) => String(m._id) === String(id));
    if (idx !== -1) {
      const removed = medicinesInventory.splice(idx, 1)[0];
      return true;
    }
    return false;
  },

  searchMedicines: (query) => {
    const q = (query || '').toLowerCase().trim();
    let list = [...medicinesInventory];

    if (q) {
      list = list.filter((m) => {
        const nameLower = (m.name || '').toLowerCase();
        const catLower = (m.category || '').toLowerCase();
        return nameLower.includes(q) || catLower.includes(q);
      });
    }

    // Sort order:
    // 1. Exact prefix match (name starts with query)
    // 2. Word prefix match (any word in name starts with query)
    // 3. Higher prescriptionCount (frequency priority)
    // 4. Higher remaining stock quantity
    list.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      if (q) {
        const aPrefix = aName.startsWith(q);
        const bPrefix = bName.startsWith(q);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;

        const aWordPrefix = aName.split(/[\s-]+/).some(w => w.startsWith(q));
        const bWordPrefix = bName.split(/[\s-]+/).some(w => w.startsWith(q));
        if (aWordPrefix && !bWordPrefix) return -1;
        if (!aWordPrefix && bWordPrefix) return 1;
      }

      // Priority: Higher prescription count (most prescribed)
      const countA = a.prescriptionCount || 0;
      const countB = b.prescriptionCount || 0;
      if (countB !== countA) {
        return countB - countA;
      }

      // Priority: Higher stock available
      return (b.quantity || 0) - (a.quantity || 0);
    });

    return list.map((m) => ({
      ...m,
      isOutOfStock: (m.quantity || 0) <= 0,
      isLowStock: (m.quantity || 0) > 0 && (m.quantity || 0) <= 20
    }));
  },

  addMedicineToSearchIndex: (name) => {
    if (name && typeof name === 'string' && name.trim()) {
      medicineSearchIndex.add(name.trim());
      // Check if already in inventory, if not add stub
      const exists = medicinesInventory.some(m => m.name.toLowerCase() === name.trim().toLowerCase());
      if (!exists) {
        memoryStore.addMedicine({
          name: name.trim(),
          category: 'General',
          quantity: 50,
          unit: 'Tablets',
          dosage: '1 tablet',
          pricePerUnit: 10
        });
      }
    }
  },

  createPrescription: ({ appointmentId, doctorId, patientId, patientName, medicines, diagnosis, notes }) => {
    const _id = '65f' + Math.random().toString(16).substring(2, 23).padEnd(21, '0');
    const docObj = users.find((u) => String(u._id) === String(doctorId));
    const patObj = users.find((u) => String(u._id) === String(patientId));

    // Dynamic Bill Calculation from Doctor Fee & Prescribed Medicines + Stock Deduction
    const consultationFee = docObj?.consultationFee || 150;
    const registrationFee = 50;
    let pharmacyFee = 0;
    const billItems = [
      { name: `Dr. Consultation (${docObj?.specialization || 'Specialist'})`, cost: consultationFee, type: 'consultation' }
    ];

    const processedMedicines = (medicines || []).map((m) => {
      const tabs = Number(m.tablets) || 10;
      const medName = m.name || m.medicineName || 'Medicine';

      // Find in inventory to deduct stock and increment prescriptionCount
      const invMed = medicinesInventory.find((item) => 
        item.name.toLowerCase() === medName.toLowerCase() ||
        medName.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(medName.toLowerCase())
      );

      let pricePerUnit = m.pricePerUnit || 15;
      if (invMed) {
        invMed.quantity = Math.max(0, (invMed.quantity || 0) - tabs);
        invMed.prescriptionCount = (invMed.prescriptionCount || 0) + 1;
        pricePerUnit = invMed.pricePerUnit || pricePerUnit;
      } else {
        // Register new medicine in search index and inventory
        memoryStore.addMedicineToSearchIndex(medName);
      }

      const totalCost = m.totalCost || Math.max(40, tabs * pricePerUnit);
      pharmacyFee += totalCost;
      billItems.push({
        name: `${medName} (${tabs} tabs)`,
        cost: totalCost,
        type: 'pharmacy'
      });

      return {
        ...m,
        name: medName,
        duration: m.duration || m.dosage || 'As advised',
        tablets: tabs,
        pricePerUnit,
        totalCost
      };
    });

    billItems.push({ name: 'Hospital Processing & Registration', cost: registrationFee, type: 'registration' });
    const totalAmount = consultationFee + pharmacyFee + registrationFee;

    const newPres = {
      _id,
      appointmentId,
      doctorId: docObj ? { _id: docObj._id, name: docObj.name, specialization: docObj.specialization, phone: docObj.phone, degree: docObj.degree || docObj.qualification, consultationFee } : doctorId,
      doctor: docObj ? { _id: docObj._id, name: docObj.name, specialization: docObj.specialization, phone: docObj.phone, degree: docObj.degree || docObj.qualification, consultationFee } : null,
      patientId,
      patientName: patientName || patObj?.name || 'Patient',
      medicines: processedMedicines,
      diagnosis,
      notes,
      instructions: notes,
      paymentStatus: 'Pending',
      bill: {
        consultationFee,
        pharmacyFee,
        registrationFee,
        totalAmount,
        isGenerated: true,
        items: billItems
      },
      createdAt: new Date().toISOString()
    };
    prescriptions.push(newPres);

    // Update appointment status to Completed
    memoryStore.updateAppointmentStatus(appointmentId, 'Completed');

    return newPres;
  },

  updatePrescriptionPayment: (id, { upiId, transactionId, amount }) => {
    const pres = prescriptions.find((p) => String(p._id) === String(id));
    if (pres) {
      pres.paymentStatus = 'Paid';
      pres.paymentDetails = {
        upiId: upiId || 'krishna4u.rn@oksbi',
        transactionId: transactionId || ('TXN' + Date.now()),
        amount: amount || pres.bill?.totalAmount || 550,
        paidAt: new Date().toISOString()
      };

      // Also update linked appointment payment if exists
      if (pres.appointmentId) {
        memoryStore.updateAppointmentPayment(pres.appointmentId, { upiId, transactionId });
      }
    }
    return pres;
  },

  getPatientPrescriptions: (patientId) => {
    return prescriptions.filter((p) => String(p.patientId) === String(patientId));
  },

  getAllPrescriptions: () => {
    return prescriptions;
  },

  createReminder: (reminderData) => {
    const _id = '65f' + Math.random().toString(16).substring(2, 23).padEnd(21, '0');
    const newRem = { _id, ...reminderData, isActive: true };
    reminders.push(newRem);
    return newRem;
  }
};
