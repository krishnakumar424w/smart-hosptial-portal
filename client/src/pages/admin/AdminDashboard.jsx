import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  getAllUsers,
  deleteUser,
  getAllAppointmentsAdmin,
  getAllInventory,
  addInventoryMedicine,
  updateInventoryMedicine,
  deleteInventoryMedicine
} from '../../services/api';
import TopHeader from '../../components/TopHeader';
import MedicalHistoryModal from '../../components/MedicalHistoryModal';
import GoogleMedicineSearchModal from '../../components/GoogleMedicineSearchModal';
import UserAvatar from '../../components/UserAvatar';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Users,
  UserCheck,
  Stethoscope,
  CalendarCheck,
  TrendingUp,
  BarChart3,
  Trash2,
  ShieldCheck,
  Activity,
  Pill,
  Plus,
  Edit2,
  Search,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Package,
  X,
  Layers,
  Sparkles,
  Eye,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Heart,
  Clock,
  CreditCard,
  ChevronRight,
  FileText,
  Check,
  DollarSign
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'inventory' | 'users'
  const [selectedDrillDown, setSelectedDrillDown] = useState('users'); // 'users' | 'patients' | 'doctors' | 'appointments'
  const [drillDownSearch, setDrillDownSearch] = useState('');

  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, patients: 0, doctors: 0, totalAppointments: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected Patient for Medical History Modal
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState(null);

  // Inventory filtering and modal state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStockFilter, setSelectedStockFilter] = useState('All'); // 'All', 'InStock', 'LowStock', 'OutOfStock'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [googleSearchModalOpen, setGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');

  // New Medicine Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Analgesic / Antipyretic',
    quantity: 100,
    unit: 'Tablets',
    dosage: '1 tablet after food',
    pricePerUnit: 10,
    expiryDate: '2027-12-31',
    supplier: 'Hospital Central Pharmacy'
  });

  useEffect(() => {
    fetchAdminData();
    fetchInventoryData();
  }, []);

  const getAppointmentFee = (appointment) => {
    const rawValue = Number(
      appointment?.doctorFee ??
      appointment?.consultationFee ??
      appointment?.fee ??
      appointment?.doctor?.consultationFee ??
      appointment?.doctorId?.consultationFee ??
      appointment?.amount ??
      150
    );

    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 150;
  };

  const getPaidRevenue = (items = []) => items
    .filter((appointment) => {
      const paymentStatus = String(appointment?.paymentStatus || '').toLowerCase();
      const status = String(appointment?.status || '').toLowerCase();
      return paymentStatus === 'paid' || paymentStatus === 'completed' || status === 'paid' || status === 'completed';
    })
    .reduce((sum, appointment) => sum + getAppointmentFee(appointment), 0);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, appRes] = await Promise.all([
        getAllUsers(),
        getAllAppointmentsAdmin()
      ]);

      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const appointmentsData = Array.isArray(appRes.data) ? appRes.data : [];

      setUsers(usersData);
      setAppointments(appointmentsData);

      const patients = usersData.filter((u) => u.role === 'patient').length;
      const doctors = usersData.filter((u) => u.role === 'doctor').length;
      const revenue = getPaidRevenue(appointmentsData);

      setStats({
        totalUsers: usersData.length,
        patients,
        doctors,
        totalAppointments: appointmentsData.length,
        revenue,
        hospitalProfit: revenue
      });
      setError('');
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError('Failed to fetch system data from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setInventoryLoading(true);
      const { data } = await getAllInventory();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setMedicines([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleDeleteUser = async (id, name = 'user') => {
    if (!id) {
      setError('User ID is missing. Please refresh the admin dashboard and try again.');
      return;
    }

    const safeId = String(id);
    const targetUser = users.find((u) => String(u._id) === safeId);
    const isCurrentUser = user && (String(user._id) === safeId || user.email?.toLowerCase() === (targetUser?.email || name)?.toLowerCase());
    const confirmMessage = isCurrentUser
      ? `WARNING: You are about to permanently delete your currently active Administrator account (${name}). You will be immediately logged out. Proceed?`
      : `Are you sure you want to permanently delete user account "${name}" from the system? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        setError('');
        const res = await deleteUser(safeId);
        const success = res?.status === 200 || res?.status === 204 || res?.data?.success === true;

        if (success) {
          const deletedRole = targetUser?.role;
          setUsers((prev) => prev.filter((u) => String(u._id) !== safeId));
          setStats((prev) => ({
            ...prev,
            totalUsers: Math.max(0, prev.totalUsers - 1),
            patients: Math.max(0, prev.patients - (deletedRole === 'patient' ? 1 : 0)),
            doctors: Math.max(0, prev.doctors - (deletedRole === 'doctor' ? 1 : 0))
          }));

          setSuccessMessage(`Account "${name}" permanently deleted from system.`);

          if (isCurrentUser) {
            setTimeout(() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }, 1000);
            return;
          }

          await fetchAdminData();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          const errMsg = res?.data?.message || 'Failed to delete user account.';
          setError(errMsg);
          setTimeout(() => setError(''), 5000);
        }
      } catch (err) {
        console.error('Failed to delete user:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete user';
        setError(`Deletion failed: ${errMsg}`);
        setTimeout(() => setError(''), 5000);
        await fetchAdminData();
      }
    }
  }; 

  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter medicine name');
      return;
    }

    try {
      await addInventoryMedicine({
        ...formData,
        quantity: Number(formData.quantity) || 0,
        pricePerUnit: Number(formData.pricePerUnit) || 10
      });
      setSuccessMessage(`Added "${formData.name}" to hospital medicine inventory.`);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        category: 'Analgesic / Antipyretic',
        quantity: 100,
        unit: 'Tablets',
        dosage: '1 tablet after food',
        pricePerUnit: 10,
        expiryDate: '2027-12-31',
        supplier: 'Hospital Central Pharmacy'
      });
      fetchInventoryData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine');
    }
  };

  const handleUpdateMedicineSubmit = async (e) => {
    e.preventDefault();
    if (!editingMedicine) return;

    try {
      await updateInventoryMedicine(editingMedicine._id, {
        name: editingMedicine.name,
        category: editingMedicine.category,
        quantity: Number(editingMedicine.quantity) || 0,
        unit: editingMedicine.unit,
        dosage: editingMedicine.dosage,
        pricePerUnit: Number(editingMedicine.pricePerUnit) || 10,
        expiryDate: editingMedicine.expiryDate,
        supplier: editingMedicine.supplier
      });
      setSuccessMessage(`Updated "${editingMedicine.name}" stock & details successfully.`);
      setEditingMedicine(null);
      fetchInventoryData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update medicine');
    }
  };

  const handleQuickRestock = async (med, addedQty) => {
    try {
      const newQty = (med.quantity || 0) + addedQty;
      await updateInventoryMedicine(med._id, { quantity: newQty });
      setSuccessMessage(`Restocked +${addedQty} units for ${med.name}. (New stock: ${newQty})`);
      fetchInventoryData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('Failed to restock');
    }
  };

  const handleDeleteMedicine = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from hospital inventory?`)) {
      try {
        await deleteInventoryMedicine(id);
        setSuccessMessage(`Removed "${name}" from inventory.`);
        fetchInventoryData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        alert('Failed to delete medicine');
      }
    }
  };

  // Categories list
  const categories = ['All', ...new Set(medicines.map((m) => m.category).filter(Boolean))];

  // Filtered medicines
  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;

    let matchesStock = true;
    const qty = m.quantity || 0;
    if (selectedStockFilter === 'InStock') matchesStock = qty > 50;
    if (selectedStockFilter === 'LowStock') matchesStock = qty > 0 && qty <= 20;
    if (selectedStockFilter === 'OutOfStock') matchesStock = qty <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const inStockCount = medicines.filter((m) => (m.quantity || 0) > 50).length;
  const lowStockCount = medicines.filter((m) => (m.quantity || 0) > 0 && (m.quantity || 0) <= 20).length;
  const outOfStockCount = medicines.filter((m) => (m.quantity || 0) <= 0).length;

  // Patient Intake Chart Data
  const patientIntakeData = [
    { day: 'Mon', patientsReceived: 12, outpatient: 8, emergency: 4 },
    { day: 'Tue', patientsReceived: 18, outpatient: 12, emergency: 6 },
    { day: 'Wed', patientsReceived: 25, outpatient: 18, emergency: 7 },
    { day: 'Thu', patientsReceived: 22, outpatient: 15, emergency: 7 },
    { day: 'Fri', patientsReceived: 30, outpatient: 22, emergency: 8 },
    { day: 'Sat', patientsReceived: 15, outpatient: 10, emergency: 5 },
    { day: 'Sun', patientsReceived: 10, outpatient: 6, emergency: 4 }
  ];

  // Appointment Status Breakdown
  const statusData = [
    { name: 'Completed', value: appointments.filter((a) => a.status === 'Completed' || a.paymentStatus === 'Completed').length || 0, color: '#16a34a' },
    { name: 'Pending', value: appointments.filter((a) => a.status === 'Pending' || a.paymentStatus === 'Pending').length || 0, color: '#d97706' },
    { name: 'Confirmed', value: appointments.filter((a) => a.status === 'Confirmed' || a.paymentStatus === 'Paid').length || 0, color: '#0284c7' }
  ];

  const revenueTrend = useMemo(() => {
    const toDateKey = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const getWindowData = (dayCount) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(today.getDate() - dayCount + 1);

      const previousStart = new Date(start);
      previousStart.setDate(start.getDate() - dayCount);

      const currentItems = appointments.filter((appointment) => {
        const key = toDateKey(appointment?.date || appointment?.createdAt);
        if (!key) return false;
        const itemDate = new Date(key + 'T00:00:00');
        return itemDate >= start && itemDate <= today;
      });

      const previousItems = appointments.filter((appointment) => {
        const key = toDateKey(appointment?.date || appointment?.createdAt);
        if (!key) return false;
        const itemDate = new Date(key + 'T00:00:00');
        return itemDate >= previousStart && itemDate < start;
      });

      const currentValue = currentItems.reduce((sum, appointment) => sum + getAppointmentFee(appointment), 0);
      const previousValue = previousItems.reduce((sum, appointment) => sum + getAppointmentFee(appointment), 0);
      const change = previousValue === 0 ? (currentValue === 0 ? 0 : 100) : ((currentValue - previousValue) / previousValue) * 100;

      return {
        currentValue,
        previousValue,
        change,
        currentCount: currentItems.length,
        previousCount: previousItems.length
      };
    };

    const weekData = getWindowData(7);
    const monthData = getWindowData(30);

    return {
      weekly: weekData,
      monthly: monthData,
      appointments: {
        current: weekData.currentCount,
        previous: weekData.previousCount,
        change: weekData.previousCount === 0 ? (weekData.currentCount === 0 ? 0 : 100) : ((weekData.currentCount - weekData.previousCount) / weekData.previousCount) * 100,
      },
      revenue: {
        current: weekData.currentValue,
        previous: weekData.previousValue,
        change: weekData.previousValue === 0 ? (weekData.currentValue === 0 ? 0 : 100) : ((weekData.currentValue - weekData.previousValue) / weekData.previousValue) * 100,
      }
    };
  }, [appointments]);

  // ==========================================
  // DRILL DOWN FILTER LOGIC & DATA PREPARATION
  // ==========================================
  const searchLower = drillDownSearch.toLowerCase().trim();

  // 1. All Users Filtered
  const filteredUsers = users.filter((u) => {
    if (!searchLower) return true;
    return (
      (u.name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.role || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower)
    );
  });

  // 2. Patients Filtered
  const patientUsers = users.filter((u) => u.role === 'patient');
  const filteredPatients = patientUsers.filter((p) => {
    if (!searchLower) return true;
    return (
      (p.name || '').toLowerCase().includes(searchLower) ||
      (p.email || '').toLowerCase().includes(searchLower) ||
      (p.phone || '').toLowerCase().includes(searchLower) ||
      (p.bloodGroup || '').toLowerCase().includes(searchLower)
    );
  });

  // 3. Doctors Filtered
  const doctorUsers = users.filter((u) => u.role === 'doctor');
  const filteredDoctors = doctorUsers.filter((d) => {
    if (!searchLower) return true;
    return (
      (d.name || '').toLowerCase().includes(searchLower) ||
      (d.email || '').toLowerCase().includes(searchLower) ||
      (d.specialization || '').toLowerCase().includes(searchLower) ||
      (d.degree || '').toLowerCase().includes(searchLower) ||
      (d.phone || '').toLowerCase().includes(searchLower)
    );
  });

  // 4. Appointments Filtered
  const filteredAppointments = appointments.filter((a) => {
    if (!searchLower) return true;
    const pName = a.patient?.name || a.patientId?.name || (typeof a.patientId === 'object' ? a.patientId?.name : '') || '';
    const dName = a.doctor?.name || a.doctorId?.name || (typeof a.doctorId === 'object' ? a.doctorId?.name : '') || '';
    const symptoms = a.symptoms || '';
    const date = a.date || '';
    const payStatus = a.paymentStatus || '';
    const status = a.status || '';

    return (
      pName.toLowerCase().includes(searchLower) ||
      dName.toLowerCase().includes(searchLower) ||
      symptoms.toLowerCase().includes(searchLower) ||
      date.toLowerCase().includes(searchLower) ||
      payStatus.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower)
    );
  });

  // Helper to count appointments for a specific patient
  const getPatientAppointmentCount = (patientId) => {
    return appointments.filter((a) => {
      const pId = typeof a.patientId === 'object' ? a.patientId?._id : a.patientId;
      return String(pId) === String(patientId);
    }).length;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* Top Header with Profile Access */}
      <TopHeader title="Administrator Dashboard" />

      <div style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 16px' }}>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#ffffff',
          padding: '8px 12px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <button
            id="tab-btn-analytics"
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'analytics' ? '#0284c7' : 'transparent',
              color: activeTab === 'analytics' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'analytics' ? '0 4px 10px rgba(2, 132, 199, 0.25)' : 'none'
            }}
          >
            <TrendingUp size={18} /> Overview & Drill-Down Views
          </button>

          <button
            id="tab-btn-inventory"
            onClick={() => setActiveTab('inventory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'inventory' ? '#0284c7' : 'transparent',
              color: activeTab === 'inventory' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'inventory' ? '0 4px 10px rgba(2, 132, 199, 0.25)' : 'none'
            }}
          >
            <Pill size={18} /> Medicine Inventory & Stock
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'inventory' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'inventory' ? '#ffffff' : '#475569'
            }}>
              {medicines.length}
            </span>
          </button>

          <button
            id="tab-btn-users"
            onClick={() => {
              setActiveTab('analytics');
              setSelectedDrillDown('users');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeTab === 'analytics' && selectedDrillDown === 'users' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              color: activeTab === 'analytics' && selectedDrillDown === 'users' ? '#0284c7' : '#64748b'
            }}
          >
            <ShieldCheck size={18} /> User Directory ({users.length})
          </button>
        </div>

        {/* Global Success / Alert Banner */}
        {successMessage && (
          <div style={{
            backgroundColor: '#f0fdf4',
            color: '#166534',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '20px',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <CheckCircle size={18} /> {successMessage}
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '20px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & INTERACTIVE DRILL-DOWN ANALYTICS */}
        {activeTab === 'analytics' && (
          <div>
            {/* SECTION 1: 4 INTERACTIVE STATISTIC SUMMARY CARDS */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Interactive System Analytics (Click any card to inspect detailed drill-down)
                </span>
                <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} /> Active Drill-Down: <strong style={{ textTransform: 'uppercase' }}>{selectedDrillDown}</strong>
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}>
                {/* 1. TOTAL USERS CARD */}
                <button
                  id="stat-card-total-users"
                  type="button"
                  onClick={() => {
                    setSelectedDrillDown('users');
                    setDrillDownSearch('');
                  }}
                  style={{
                    backgroundColor: selectedDrillDown === 'users' ? '#f0f9ff' : '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    border: selectedDrillDown === 'users' ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                    boxShadow: selectedDrillDown === 'users'
                      ? '0 10px 25px -5px rgba(2, 132, 199, 0.2)'
                      : '0 2px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedDrillDown === 'users' ? 'translateY(-2px)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDrillDown !== 'users') {
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDrillDown !== 'users') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: selectedDrillDown === 'users' ? '#0369a1' : '#64748b', letterSpacing: '0.6px' }}>
                      TOTAL USERS
                    </span>
                    <div style={{
                      backgroundColor: selectedDrillDown === 'users' ? '#0284c7' : '#e0f2fe',
                      color: selectedDrillDown === 'users' ? '#ffffff' : '#0284c7',
                      padding: '8px',
                      borderRadius: '10px'
                    }}>
                      <Users size={20} />
                    </div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '10px', lineHeight: '1' }}>
                    {stats.totalUsers}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>All System Accounts</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: selectedDrillDown === 'users' ? '#0284c7' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {selectedDrillDown === 'users' ? 'Viewing Table' : 'Click to View'} <ChevronRight size={14} />
                    </span>
                  </div>
                </button>

                {/* 2. TOTAL PATIENTS CARD */}
                <button
                  id="stat-card-total-patients"
                  type="button"
                  onClick={() => {
                    setSelectedDrillDown('patients');
                    setDrillDownSearch('');
                  }}
                  style={{
                    backgroundColor: selectedDrillDown === 'patients' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    border: selectedDrillDown === 'patients' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                    boxShadow: selectedDrillDown === 'patients'
                      ? '0 10px 25px -5px rgba(22, 163, 74, 0.2)'
                      : '0 2px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedDrillDown === 'patients' ? 'translateY(-2px)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDrillDown !== 'patients') {
                      e.currentTarget.style.borderColor = '#86efac';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDrillDown !== 'patients') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: selectedDrillDown === 'patients' ? '#15803d' : '#64748b', letterSpacing: '0.6px' }}>
                      TOTAL PATIENTS
                    </span>
                    <div style={{
                      backgroundColor: selectedDrillDown === 'patients' ? '#16a34a' : '#dcfce7',
                      color: selectedDrillDown === 'patients' ? '#ffffff' : '#16a34a',
                      padding: '8px',
                      borderRadius: '10px'
                    }}>
                      <UserCheck size={20} />
                    </div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#16a34a', marginTop: '10px', lineHeight: '1' }}>
                    {stats.patients}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Patient Medical Profiles</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: selectedDrillDown === 'patients' ? '#16a34a' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {selectedDrillDown === 'patients' ? 'Viewing Table' : 'Click to View'} <ChevronRight size={14} />
                    </span>
                  </div>
                </button>

                {/* 3. ACTIVE DOCTORS CARD */}
                <button
                  id="stat-card-active-doctors"
                  type="button"
                  onClick={() => {
                    setSelectedDrillDown('doctors');
                    setDrillDownSearch('');
                  }}
                  style={{
                    backgroundColor: selectedDrillDown === 'doctors' ? '#faf5ff' : '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    border: selectedDrillDown === 'doctors' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                    boxShadow: selectedDrillDown === 'doctors'
                      ? '0 10px 25px -5px rgba(124, 58, 237, 0.2)'
                      : '0 2px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedDrillDown === 'doctors' ? 'translateY(-2px)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDrillDown !== 'doctors') {
                      e.currentTarget.style.borderColor = '#c084fc';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDrillDown !== 'doctors') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: selectedDrillDown === 'doctors' ? '#6b21a8' : '#64748b', letterSpacing: '0.6px' }}>
                      ACTIVE DOCTORS
                    </span>
                    <div style={{
                      backgroundColor: selectedDrillDown === 'doctors' ? '#7c3aed' : '#f3e8ff',
                      color: selectedDrillDown === 'doctors' ? '#ffffff' : '#7c3aed',
                      padding: '8px',
                      borderRadius: '10px'
                    }}>
                      <Stethoscope size={20} />
                    </div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#7c3aed', marginTop: '10px', lineHeight: '1' }}>
                    {stats.doctors}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Specialists & Consultants</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: selectedDrillDown === 'doctors' ? '#7c3aed' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {selectedDrillDown === 'doctors' ? 'Viewing Table' : 'Click to View'} <ChevronRight size={14} />
                    </span>
                  </div>
                </button>

                {/* 4. APPOINTMENTS CARD */}
                <button
                  id="stat-card-appointments"
                  type="button"
                  onClick={() => {
                    setSelectedDrillDown('appointments');
                    setDrillDownSearch('');
                  }}
                  style={{
                    backgroundColor: selectedDrillDown === 'appointments' ? '#fff7ed' : '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 22px',
                    border: selectedDrillDown === 'appointments' ? '2px solid #ea580c' : '1.5px solid #e2e8f0',
                    boxShadow: selectedDrillDown === 'appointments'
                      ? '0 10px 25px -5px rgba(234, 88, 12, 0.2)'
                      : '0 2px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedDrillDown === 'appointments' ? 'translateY(-2px)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDrillDown !== 'appointments') {
                      e.currentTarget.style.borderColor = '#fdba74';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDrillDown !== 'appointments') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: selectedDrillDown === 'appointments' ? '#c2410c' : '#64748b', letterSpacing: '0.6px' }}>
                      APPOINTMENTS
                    </span>
                    <div style={{
                      backgroundColor: selectedDrillDown === 'appointments' ? '#ea580c' : '#ffedd5',
                      color: selectedDrillDown === 'appointments' ? '#ffffff' : '#ea580c',
                      padding: '8px',
                      borderRadius: '10px'
                    }}>
                      <CalendarCheck size={20} />
                    </div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#ea580c', marginTop: '10px', lineHeight: '1' }}>
                    {stats.totalAppointments}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Consultations & Bookings</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: selectedDrillDown === 'appointments' ? '#ea580c' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {selectedDrillDown === 'appointments' ? 'Viewing Table' : 'Click to View'} <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '14px',
                padding: '18px 20px',
                color: '#0f172a'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.7px', color: '#1d4ed8', textTransform: 'uppercase' }}>Appointments Trend</div>
                <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '8px' }}>{revenueTrend.appointments.current}</div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#1e3a8a', fontWeight: '700' }}>
                  {revenueTrend.appointments.change >= 0 ? '+' : ''}{revenueTrend.appointments.change.toFixed(1)}% vs previous 7 days
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: '14px',
                padding: '18px 20px',
                color: '#0f172a'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.7px', color: '#15803d', textTransform: 'uppercase' }}>Revenue Trend</div>
                <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '8px' }}>₹{Math.round(revenueTrend.revenue.current).toLocaleString('en-IN')}</div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#166534', fontWeight: '700' }}>
                  {revenueTrend.revenue.change >= 0 ? '+' : ''}{revenueTrend.revenue.change.toFixed(1)}% vs previous 7 days
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1px solid #fcd34d',
                borderRadius: '14px',
                padding: '18px 20px',
                color: '#0f172a'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.7px', color: '#92400e', textTransform: 'uppercase' }}>Paid Bookings</div>
                <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '8px' }}>{appointments.filter((a) => a.paymentStatus === 'Paid' || a.status === 'Paid' || a.paymentStatus === 'Completed' || a.status === 'Completed').length}</div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#78350f', fontWeight: '700' }}>
                  {revenueTrend.monthly.change >= 0 ? '+' : ''}{revenueTrend.monthly.change.toFixed(1)}% monthly revenue shift
                </div>
              </div>
            </div>

            {/* SECTION 2: DYNAMIC DRILL-DOWN SECTION DIRECTLY BELOW CARDS */}
            <div
              id="admin-dynamic-drilldown-container"
              style={{
                marginTop: '24px',
                marginBottom: '32px',
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '24px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)'
              }}
            >
              {/* Header & Quick Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      backgroundColor:
                        selectedDrillDown === 'users' ? '#e0f2fe' :
                        selectedDrillDown === 'patients' ? '#dcfce7' :
                        selectedDrillDown === 'doctors' ? '#f3e8ff' : '#ffedd5',
                      color:
                        selectedDrillDown === 'users' ? '#0284c7' :
                        selectedDrillDown === 'patients' ? '#15803d' :
                        selectedDrillDown === 'doctors' ? '#7c3aed' : '#ea580c'
                    }}>
                      {selectedDrillDown === 'users' && <Users size={13} />}
                      {selectedDrillDown === 'patients' && <UserCheck size={13} />}
                      {selectedDrillDown === 'doctors' && <Stethoscope size={13} />}
                      {selectedDrillDown === 'appointments' && <CalendarCheck size={13} />}
                      Detailed Drill-Down Table
                    </span>
                  </div>
                  <h3 style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                    {selectedDrillDown === 'users' && 'System User Directory & Roles'}
                    {selectedDrillDown === 'patients' && 'Hospital Patients & Health Records'}
                    {selectedDrillDown === 'doctors' && 'Medical Specialists & Doctors Roster'}
                    {selectedDrillDown === 'appointments' && 'All Patient Consultation Bookings'}
                  </h3>
                </div>

                {/* Search Bar & Counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search
                      size={16}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                    <input
                      id="drilldown-search-input"
                      type="text"
                      placeholder={`Search ${selectedDrillDown}...`}
                      value={drillDownSearch}
                      onChange={(e) => setDrillDownSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        backgroundColor: '#f8fafc'
                      }}
                    />
                    {drillDownSearch && (
                      <button
                        type="button"
                        onClick={() => setDrillDownSearch('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap'
                  }}>
                    {selectedDrillDown === 'users' && `Showing ${filteredUsers.length} of ${users.length}`}
                    {selectedDrillDown === 'patients' && `Showing ${filteredPatients.length} of ${stats.patients}`}
                    {selectedDrillDown === 'doctors' && `Showing ${filteredDoctors.length} of ${stats.doctors}`}
                    {selectedDrillDown === 'appointments' && `Showing ${filteredAppointments.length} of ${appointments.length}`}
                  </span>
                </div>
              </div>

              {/* DYNAMIC VIEW 1: TOTAL USERS TABLE */}
              {selectedDrillDown === 'users' && (
                <div style={{ overflowX: 'auto', animation: 'fadeIn 0.2s ease-in-out' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>User Details</th>
                        <th style={{ padding: '12px 14px' }}>Email Address</th>
                        <th style={{ padding: '12px 14px' }}>Role</th>
                        <th style={{ padding: '12px 14px' }}>Phone Contact</th>
                        <th style={{ padding: '12px 14px' }}>Registration Date</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            No users found matching "{drillDownSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserAvatar
                                  src={u.photo}
                                  role={u.role}
                                  name={u.name}
                                  size={36}
                                />
                                <div>
                                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{u.name}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {String(u._id).slice(-6)}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace' }}>
                              {u.email}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                backgroundColor: u.role === 'admin' ? '#f3e8ff' : u.role === 'doctor' ? '#e0f2fe' : '#f0fdf4',
                                color: u.role === 'admin' ? '#6b21a8' : u.role === 'doctor' ? '#0369a1' : '#15803d'
                              }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                              {u.phone || 'N/A'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active User'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                type="button"
                                id={`delete-user-btn-${u._id}`}
                                onClick={() => handleDeleteUser(u._id, u.name || u.email)}
                                title={`Permanently delete user ${u.name || u.email}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DYNAMIC VIEW 2: TOTAL PATIENTS TABLE */}
              {selectedDrillDown === 'patients' && (
                <div style={{ overflowX: 'auto', animation: 'fadeIn 0.2s ease-in-out' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Patient Profile</th>
                        <th style={{ padding: '12px 14px' }}>Contact Info</th>
                        <th style={{ padding: '12px 14px' }}>Age / Gender / Blood</th>
                        <th style={{ padding: '12px 14px' }}>Appointments History</th>
                        <th style={{ padding: '12px 14px' }}>EHR Medical Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            No patients found matching "{drillDownSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((p) => {
                          const apptCount = getPatientAppointmentCount(p._id);
                          return (
                            <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <UserAvatar
                                    src={p.photo}
                                    role="patient"
                                    name={p.name}
                                    size={36}
                                  />
                                  <div>
                                    <div style={{ fontWeight: '800', color: '#0f172a' }}>{p.name}</div>
                                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Patient ID: {String(p._id).slice(-6)}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ color: '#0f172a', fontWeight: '600' }}>{p.email}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <Phone size={11} /> {p.phone || 'Not provided'}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: '600', color: '#334155' }}>
                                  {p.age || '32'} Yrs • {p.gender || 'Male'}
                                </div>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  marginTop: '2px'
                                }}>
                                  Blood: {p.bloodGroup || 'O+'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: apptCount > 0 ? '#e0f2fe' : '#f1f5f9',
                                  color: apptCount > 0 ? '#0284c7' : '#64748b',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontWeight: '700',
                                  fontSize: '12px'
                                }}>
                                  <CalendarCheck size={13} /> {apptCount} {apptCount === 1 ? 'Booking' : 'Bookings'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#15803d',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}>
                                  <CheckCircle size={12} /> Active EHR Profile
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    type="button"
                                    id={`view-medical-record-btn-${p._id}`}
                                    onClick={() => setSelectedPatientForHistory(p)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 12px',
                                      backgroundColor: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                                    }}
                                  >
                                    <Heart size={13} /> Medical Records
                                  </button>
                                  <button
                                    type="button"
                                    id={`delete-patient-btn-${p._id}`}
                                    onClick={() => handleDeleteUser(p._id, p.name || p.email)}
                                    title={`Delete Patient ${p.name}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 10px',
                                      backgroundColor: '#fef2f2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: '700'
                                    }}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DYNAMIC VIEW 3: ACTIVE DOCTORS TABLE */}
              {selectedDrillDown === 'doctors' && (
                <div style={{ overflowX: 'auto', animation: 'fadeIn 0.2s ease-in-out' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Doctor / Specialist</th>
                        <th style={{ padding: '12px 14px' }}>Specialization & Degree</th>
                        <th style={{ padding: '12px 14px' }}>Contact Information</th>
                        <th style={{ padding: '12px 14px' }}>Consultation Fee</th>
                        <th style={{ padding: '12px 14px' }}>Availability Schedule</th>
                        <th style={{ padding: '12px 14px' }}>Duty Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            No doctors found matching "{drillDownSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredDoctors.map((d) => (
                          <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserAvatar
                                  src={d.photo}
                                  role="doctor"
                                  name={d.name}
                                  size={38}
                                  showBadge={true}
                                />
                                <div>
                                  <div style={{ fontWeight: '800', color: '#0f172a' }}>{d.name}</div>
                                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700' }}>
                                    {d.experience || '10+ yrs experience'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.specialization || 'General Medicine'}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{d.degree || d.qualification || 'MBBS, MD'}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ color: '#334155', fontWeight: '600' }}>{d.email}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {d.phone || 'Hospital Extension: 402'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '900',
                                color: '#15803d',
                                backgroundColor: '#f0fdf4',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0'
                              }}>
                                ₹{d.consultationFee || 150}.00
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600' }}>
                                {Array.isArray(d.availableDays) ? d.availableDays.join(', ') : 'Mon, Wed, Fri'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {Array.isArray(d.availableTimeSlots) ? d.availableTimeSlots.join(', ') : '10:00 AM - 02:00 PM'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '800',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac'
                              }}>
                                ● On Duty / Active
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                type="button"
                                id={`delete-doctor-btn-${d._id}`}
                                onClick={() => handleDeleteUser(d._id, d.name || d.email)}
                                title={`Permanently delete Doctor ${d.name}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DYNAMIC VIEW 4: APPOINTMENTS TABLE */}
              {selectedDrillDown === 'appointments' && (
                <div style={{ overflowX: 'auto', animation: 'fadeIn 0.2s ease-in-out' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px 14px' }}>Appointment ID & Date</th>
                        <th style={{ padding: '12px 14px' }}>Patient Name</th>
                        <th style={{ padding: '12px 14px' }}>Consulting Doctor</th>
                        <th style={{ padding: '12px 14px' }}>Symptoms / Reason</th>
                        <th style={{ padding: '12px 14px' }}>Consultation Fee</th>
                        <th style={{ padding: '12px 14px' }}>Payment Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            No appointments found matching "{drillDownSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((a) => {
                          const pName = a.patient?.name || a.patientId?.name || (typeof a.patientId === 'object' ? a.patientId?.name : 'Registered Patient');
                          const dName = a.doctor?.name || a.doctorId?.name || (typeof a.doctorId === 'object' ? a.doctorId?.name : 'Dr. Consultant');
                          const isPaid = a.paymentStatus === 'Paid' || a.paymentStatus === 'Completed';

                          return (
                            <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: '800', color: '#0f172a' }}>
                                  {a.date ? new Date(a.date).toLocaleDateString() : 'Today'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  Slot: {a.timeSlot || a.time || '10:00 AM'} • #{String(a._id).slice(-6)}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <UserAvatar
                                    src={a.patient?.photo || a.patientId?.photo}
                                    role="patient"
                                    name={pName}
                                    size={30}
                                  />
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{pName}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {a.patient?.phone || a.patientId?.phone || 'Phone on file'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <UserAvatar
                                    src={a.doctor?.photo || a.doctorId?.photo}
                                    role="doctor"
                                    name={dName}
                                    size={30}
                                  />
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#7c3aed' }}>{dName}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {a.doctor?.specialization || a.doctorId?.specialization || 'General OPD'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                                <div style={{ color: '#334155', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {a.symptoms || 'General Consultation & Examination'}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontWeight: '800', color: '#0f172a' }}>
                                  ₹{getAppointmentFee(a)}.00
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                                  color: isPaid ? '#15803d' : '#dc2626',
                                  border: isPaid ? '1px solid #86efac' : '1px solid #fecaca'
                                }}>
                                  {isPaid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                  {isPaid ? 'PAID (UPI)' : 'PENDING'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  backgroundColor: a.status === 'Confirmed' ? '#e0f2fe' : a.status === 'Completed' ? '#f0fdf4' : '#fffbeb',
                                  color: a.status === 'Confirmed' ? '#0369a1' : a.status === 'Completed' ? '#15803d' : '#b45309'
                                }}>
                                  {a.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div style={{
                    marginTop: '18px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', letterSpacing: '0.8px', color: '#cbd5e1', fontWeight: '800', textTransform: 'uppercase' }}>Total Hospital Revenue / Profit</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px' }}>₹{Math.round(stats.revenue || 0).toLocaleString('en-IN')}.00</div>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#dbeafe'
                    }}>
                      {revenueTrend.revenue.change >= 0 ? '+' : ''}{revenueTrend.revenue.change.toFixed(1)}% vs previous period
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: GRAPHS & VISUAL ANALYTICS (PATIENT INTAKE & STATUS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Main Area Chart: Patient Intake / Receive Graph */}
              <div style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{
                      display: 'inline-block',
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '900',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      PAST MONTH
                    </div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={22} color="#ffffff" /> Hospital Patient Receive & Intake Analytics
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                      Monthly trend of patients received at outpatient & emergency receptions
                    </p>
                  </div>
                </div>

                <div style={{ width: '100%', height: 260, backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 8px 8px 8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={patientIntakeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOutpatient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="patientsReceived" name="Total Received" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorPatients)" />
                      <Area type="monotone" dataKey="outpatient" name="Outpatient" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorOutpatient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart: Appointment Status Distribution */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={18} color="#0284c7" /> Appointment Status
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#64748b' }}>
                  Reception fulfillment breakdown
                </p>

                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEDICINE INVENTORY & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div>
            {/* Inventory KPI Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TOTAL MEDICINES</span>
                  <Package size={18} color="#0284c7" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                  {medicines.length}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Hospital Pharmacy Catalog</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', letterSpacing: '0.5px' }}>IN STOCK (&gt;50)</span>
                  <CheckCircle size={18} color="#16a34a" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
                  {inStockCount}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Sufficient Hospital Reserves</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', letterSpacing: '0.5px' }}>LOW STOCK (&lt;20)</span>
                  <AlertTriangle size={18} color="#d97706" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
                  {lowStockCount}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Re-order Suggested</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', letterSpacing: '0.5px' }}>OUT OF STOCK (0)</span>
                  <X size={18} color="#dc2626" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
                  {outOfStockCount}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Urgent Replenishment Required</div>
              </div>
            </div>

            {/* Inventory Management Section */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              {/* Toolbar & Action Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Pill size={20} color="#0284c7" /> Hospital Medicine Inventory & Stock Control
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Manage pharmaceutical catalog, unit pricing, dosage instructions, and live stock supplies
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => fetchInventoryData()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} className={inventoryLoading ? 'animate-spin' : ''} /> Refresh
                  </button>

                  <button
                    id="add-new-medicine-btn"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                    }}
                  >
                    <Plus size={16} /> Add New Medicine
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search medicine name, category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Stock Filter:</span>
                  <select
                    value={selectedStockFilter}
                    onChange={(e) => setSelectedStockFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="All">All Stocks</option>
                    <option value="InStock">In Stock (&gt;50)</option>
                    <option value="LowStock">Low Stock (1-20)</option>
                    <option value="OutOfStock">Out of Stock (0)</option>
                  </select>
                </div>
              </div>

              {/* Table of Medicines */}
              {inventoryLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  <p>Loading medicine inventory...</p>
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontWeight: '600' }}>No medicines found matching criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '12px' }}>Medicine Name</th>
                        <th style={{ padding: '12px' }}>Category</th>
                        <th style={{ padding: '12px' }}>Dosage Form</th>
                        <th style={{ padding: '12px' }}>Stock Level</th>
                        <th style={{ padding: '12px' }}>Price / Unit</th>
                        <th style={{ padding: '12px' }}>Expiry Date</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedicines.map((med) => {
                        const qty = med.quantity || 0;
                        const isLow = qty > 0 && qty <= 20;
                        const isOut = qty <= 0;

                        return (
                          <tr key={med._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pill size={16} color={isOut ? '#dc2626' : isLow ? '#d97706' : '#0284c7'} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{med.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGoogleSearchQuery(med.name);
                                        setGoogleSearchModalOpen(true);
                                      }}
                                      title={`Google search medical details for ${med.name}`}
                                      style={{
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '4px',
                                        padding: '2px 5px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: '#2563eb',
                                        fontSize: '10px',
                                        fontWeight: '700'
                                      }}
                                    >
                                      <Search size={10} /> Google Info
                                    </button>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                                    {med.supplier || 'Hospital Pharmacy'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px', color: '#475569' }}>{med.category || 'General'}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                                {med.unit || 'Tablets'}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a'
                                }}>
                                  {qty}
                                </span>
                                {isOut && (
                                  <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    OUT OF STOCK
                                  </span>
                                )}
                                {isLow && (
                                  <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    LOW STOCK
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>
                              ₹{med.pricePerUnit || 10}
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>
                              {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  onClick={() => handleQuickRestock(med, 50)}
                                  title="Add +50 Units"
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  +50
                                </button>

                                <button
                                  onClick={() => handleQuickRestock(med, 100)}
                                  title="Add +100 Units"
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  +100
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => setEditingMedicine({ ...med })}
                                  title="Edit Medicine Details"
                                  style={{
                                    padding: '5px 8px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit2 size={13} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteMedicine(med._id, med.name)}
                                  title="Delete Medicine"
                                  style={{
                                    padding: '5px 8px',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: MEDICAL HISTORY FOR SELECTED PATIENT */}
      {selectedPatientForHistory && (
        <MedicalHistoryModal
          isOpen={!!selectedPatientForHistory}
          onClose={() => setSelectedPatientForHistory(null)}
          user={selectedPatientForHistory}
          appointments={appointments.filter((a) => {
            const pId = typeof a.patientId === 'object' ? a.patientId?._id : a.patientId;
            return String(pId) === String(selectedPatientForHistory._id);
          })}
        />
      )}

      {/* MODAL: ADD NEW MEDICINE */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Add Medicine to Hospital Inventory
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Analgesic / Antipyretic">Analgesic / Antipyretic</option>
                      <option value="Antibiotic">Antibiotic</option>
                      <option value="Antacid / PPI">Antacid / PPI</option>
                      <option value="Cardiology / Hypertension">Cardiology / Hypertension</option>
                      <option value="Antidiabetic">Antidiabetic</option>
                      <option value="Antihistamine / Allergy">Antihistamine / Allergy</option>
                      <option value="NSAID / Pain Relief">NSAID / Pain Relief</option>
                      <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Unit Form *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Tablets">Tablets</option>
                      <option value="Capsules">Capsules</option>
                      <option value="Softgels">Softgels</option>
                      <option value="Syrup (ml)">Syrup (ml)</option>
                      <option value="Injections">Injections</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Stock Quantity (Units) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Price Per Unit (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Supplier / Pharma
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cipla Ltd, Sun Pharma"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MEDICINE DETAILS / RESTOCK */}
      {editingMedicine && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} /> Update Medicine Stock & Details
              </h3>
              <button
                onClick={() => setEditingMedicine(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateMedicineSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMedicine.name}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Stock Quantity (Units) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingMedicine.quantity}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, quantity: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Price Per Unit (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editingMedicine.pricePerUnit}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, pricePerUnit: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingMedicine.category}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, category: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editingMedicine.expiryDate}
                      onChange={(e) => setEditingMedicine({ ...editingMedicine, expiryDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Google Medicine Search Modal */}
      <GoogleMedicineSearchModal
        isOpen={googleSearchModalOpen}
        onClose={() => setGoogleSearchModalOpen(false)}
        initialQuery={googleSearchQuery}
      />
    </div>
  );
};

export default AdminDashboard;
