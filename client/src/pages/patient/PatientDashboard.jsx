import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getMyAppointments, getMyPrescriptions } from '../../services/api';
import TopHeader from '../../components/TopHeader';
import UpiPaymentModal from '../../components/UpiPaymentModal';
import ProfileModal from '../../components/ProfileModal';
import MedicalHistoryModal from '../../components/MedicalHistoryModal';
import GoogleMedicineSearchModal from '../../components/GoogleMedicineSearchModal';
import ChromeMedicineReminderCard from '../../components/ChromeMedicineReminderCard';
import { initSocket, subscribeToAppointments } from '../../services/socket';
import {
  checkAndTriggerScheduledReminders,
  isNotificationSupported,
  getNotificationPermission,
  getStoredReminderTimes,
  DEFAULT_REMINDER_TIMES
} from '../../services/notificationService';
import {
  Calendar,
  Clock,
  PlusCircle,
  CreditCard,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  Check,
  X,
  Pill,
  Receipt,
  User,
  Sun,
  Sunset,
  Moon,
  HeartPulse,
  Printer,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Radio,
  Bell,
  BellRing,
  Search
} from 'lucide-react';

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeNotice, setRealtimeNotice] = useState(null);
  
  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(false);
  const [googleSearchModalOpen, setGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [selectedPaymentTarget, setSelectedPaymentTarget] = useState(null); // { type: 'invoice' | 'appointment', data: obj }

  // Active view tab: 'overview', 'appointments', 'bill', 'reminders', 'prescriptions'
  const [activeTab, setActiveTab] = useState('overview');

  // Selected prescription index for Invoice viewing
  const [selectedInvoiceIdx, setSelectedInvoiceIdx] = useState(0);
  const [showItemizedPharmacy, setShowItemizedPharmacy] = useState(false);

  // Interactive medicine tracking state (keyed by medId + slot)
  const [takenTracker, setTakenTracker] = useState({});
  const [highlightedSlot, setHighlightedSlot] = useState(null);
  const [customReminderTimes, setCustomReminderTimes] = useState(() => getStoredReminderTimes());

  const formatSlotTime = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h < 10 ? '0' + h : h}:${m} ${ampm}`;
  };

  const navigate = useNavigate();

  const handleScheduleFocus = (slot) => {
    setActiveTab('reminders');
    setHighlightedSlot(slot);
    setTimeout(() => {
      const el = document.getElementById('medicine-schedule-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    setTimeout(() => {
      setHighlightedSlot(null);
    }, 6000);
  };

  useEffect(() => {
    fetchPatientData();

    // Check scheduled medicine reminders against patient's custom times every 20 seconds
    const reminderInterval = setInterval(() => {
      checkAndTriggerScheduledReminders({
        schedule: getCategorizedMedicines(),
        onClickCallback: (slot) => handleScheduleFocus(slot)
      });
    }, 20000);

    // Initial check on mount
    checkAndTriggerScheduledReminders({
      schedule: getCategorizedMedicines(),
      onClickCallback: (slot) => handleScheduleFocus(slot)
    });

    // Initialize Socket.IO connection and join patient room
    const socket = initSocket(user);
    if (socket.connected) {
      setSocketConnected(true);
    }
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Subscribe to real-time events (appointments, status changes, prescriptions)
    const unsubscribe = subscribeToAppointments({
      onCreated: (newApp) => {
        if (!newApp) return;
        const pId = typeof newApp.patientId === 'object' ? newApp.patientId?._id : newApp.patientId;
        if (user?._id && String(pId) === String(user._id)) {
          setAppointments((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.some((a) => a._id === newApp._id)) return arr;
            return [newApp, ...arr];
          });
          setRealtimeNotice({
            id: Date.now(),
            title: 'Appointment Booked',
            message: `Consultation with Dr. ${newApp.doctorId?.name || 'Doctor'} confirmed for ${newApp.date ? newApp.date.split('T')[0] : 'scheduled date'}`
          });
        }
      },
      onUpdated: (updatedApp) => {
        if (!updatedApp) return;
        const pId = typeof updatedApp.patientId === 'object' ? updatedApp.patientId?._id : updatedApp.patientId;
        if (!user?._id || String(pId) === String(user._id) || !pId) {
          setAppointments((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((a) => (a._id === updatedApp._id ? { ...a, ...updatedApp } : a));
          });
          setRealtimeNotice({
            id: Date.now(),
            title: `Appointment ${updatedApp.status || 'Updated'}`,
            message: `Your appointment status was updated to ${updatedApp.status}.`
          });
        }
      },
      onStatusChanged: (statusData) => {
        if (!statusData) return;
        if (!user?._id || String(statusData.patientId) === String(user._id) || !statusData.patientId) {
          setAppointments((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((a) => (a._id === statusData.appointmentId ? { ...a, status: statusData.status } : a));
          });
        }
      },
      onPrescriptionCreated: (newPres) => {
        if (!newPres) return;
        const pId = typeof newPres.patientId === 'object' ? newPres.patientId?._id : newPres.patientId;
        if (!user?._id || String(pId) === String(user._id) || !pId) {
          setPrescriptions((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return [newPres, ...arr.filter((p) => p._id !== newPres._id)];
          });
          setRealtimeNotice({
            id: Date.now(),
            title: 'Live Prescription Issued',
            message: `Dr. ${newPres.doctor?.name || 'Doctor'} has issued your clinical prescription and invoice!`
          });
          fetchPatientData();
        }
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      unsubscribe();
      clearInterval(reminderInterval);
    };
  }, [user?._id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const [appRes, prescRes] = await Promise.all([
        getMyAppointments().catch(() => ({ data: [] })),
        getMyPrescriptions().catch(() => ({ data: [] }))
      ]);

      setAppointments(Array.isArray(appRes.data) ? appRes.data : []);
      setPrescriptions(Array.isArray(prescRes.data) ? prescRes.data : []);
      setError('');
    } catch (err) {
      console.error('Failed to load patient data:', err);
      setError('Failed to fetch patient data from server.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMedicineTaken = (key) => {
    setTakenTracker((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper to aggregate medicines by morning, evening, night
  const getCategorizedMedicines = () => {
    const morningList = [];
    const eveningList = [];
    const nightList = [];

    (Array.isArray(prescriptions) ? prescriptions : []).forEach((pres) => {
      const docName = pres.doctor?.name || pres.doctorId?.name || 'Dr. Specialist';
      if (Array.isArray(pres.medicines)) {
        pres.medicines.forEach((med, idx) => {
          const medObj = {
            id: `${pres._id}-${idx}`,
            name: med.name || med.medicineName || 'Medicine',
            dosage: med.dosage || '1 tablet',
            doctor: docName,
            tablets: med.tablets || 10
          };

          if (med.timing?.morning || !med.timing) morningList.push(medObj);
          if (med.timing?.afternoon || med.timing?.evening || !med.timing) eveningList.push(medObj);
          if (med.timing?.night || !med.timing) nightList.push(medObj);
        });
      }
    });

    // Fallback if no prescriptions yet to demonstrate UI perfectly
    if (morningList.length === 0 && eveningList.length === 0 && nightList.length === 0) {
      return {
        morning: [
          { id: 'm1', name: 'Paracetamol 500mg', dosage: '1 tablet after breakfast', doctor: 'Dr. Sarah Smith' },
          { id: 'm2', name: 'Multivitamin Complex', dosage: '1 capsule with water', doctor: 'Dr. Sarah Smith' }
        ],
        evening: [
          { id: 'e1', name: 'Amoxicillin 250mg', dosage: '1 capsule after lunch', doctor: 'Dr. Sarah Smith' }
        ],
        night: [
          { id: 'n1', name: 'Antacid / Pantoprazole 40mg', dosage: '1 tablet before bed', doctor: 'Dr. Sarah Smith' }
        ]
      };
    }

    return { morning: morningList, evening: eveningList, night: nightList };
  };

  const medicineSchedule = getCategorizedMedicines();

  // Active Invoice Data based on generated prescriptions
  const hasPrescriptions = Array.isArray(prescriptions) && prescriptions.length > 0;
  const currentPrescription = hasPrescriptions ? prescriptions[selectedInvoiceIdx] || prescriptions[0] : null;

  // Calculate dynamic bill charges from the active prescription
  const calculateInvoiceBill = (pres) => {
    if (!pres) return null;
    
    // If backend already attached bill object
    if (pres.bill && pres.bill.isGenerated) {
      return {
        consultationFee: pres.bill.consultationFee || 150,
        pharmacyFee: pres.bill.pharmacyFee || 350,
        registrationFee: pres.bill.registrationFee || 50,
        totalAmount: pres.bill.totalAmount || 550,
        items: pres.bill.items || [],
        paymentStatus: pres.paymentStatus || 'Pending',
        paymentDetails: pres.paymentDetails || null
      };
    }

    // Otherwise calculate dynamically on the fly
    const consultationFee = pres.doctor?.consultationFee || pres.doctorId?.consultationFee || 150;
    const registrationFee = 50;
    let pharmacyFee = 0;
    const items = [
      { name: `Dr. Consultation (${pres.doctor?.specialization || 'Consultant'})`, cost: consultationFee, type: 'consultation' }
    ];

    (pres.medicines || []).forEach((m) => {
      const tabs = Number(m.tablets) || 10;
      const pricePerUnit = m.pricePerUnit || 15;
      const cost = m.totalCost || Math.max(50, tabs * pricePerUnit);
      pharmacyFee += cost;
      items.push({
        name: `${m.name || 'Medicine'} (${tabs} tablets)`,
        cost,
        type: 'pharmacy'
      });
    });

    if (pharmacyFee === 0) pharmacyFee = 350; // default pharmacy tier
    items.push({ name: 'Hospital Processing & Registration', cost: registrationFee, type: 'registration' });

    const totalAmount = consultationFee + pharmacyFee + registrationFee;

    return {
      consultationFee,
      pharmacyFee,
      registrationFee,
      totalAmount,
      items,
      paymentStatus: pres.paymentStatus || 'Pending',
      paymentDetails: pres.paymentDetails || null
    };
  };

  const currentBill = calculateInvoiceBill(currentPrescription);
  const isInvoicePaid = currentBill?.paymentStatus === 'Paid';

  const scrollToSection = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f9ff', color: '#0f172a' }}>
      {/* Top Header */}
      <TopHeader title="Patient Care Portal" />

      {/* Main Container */}
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Real-time WebSocket Notice Banner */}
        {realtimeNotice && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#22c55e', color: '#ffffff', padding: '6px', borderRadius: '50%' }}>
                <Zap size={18} />
              </div>
              <div style={{ fontSize: '13px', color: '#15803d' }}>
                {realtimeNotice.message ? (
                  <><strong>{realtimeNotice.title || 'Live Update'}:</strong> {realtimeNotice.message}</>
                ) : (
                  <><strong>{realtimeNotice.doctorName}</strong> submitted a completed prescription for <em>"{realtimeNotice.diagnosis}"</em>. Official Hospital Invoice has been automatically generated below!</>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { setActiveTab('overview'); setRealtimeNotice(null); }}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
              <button
                onClick={() => setRealtimeNotice(null)}
                style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Welcome Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9, fontWeight: '800' }}>
              OFFICIAL PATIENT DASHBOARD
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '800', color: '#ffffff' }}>
              Welcome back, {user?.name || 'Patient'}!
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
              Fast-track hospital actions: book doctor visits, view automatic invoices, or track daily medicines.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsMedicalHistoryOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <HeartPulse size={16} /> Medical History
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <User size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          {[
            { id: 'overview', label: 'All-In-One Overview', icon: Activity },
            { id: 'bill', label: 'Hospital Bill & Invoice', icon: Receipt },
            { id: 'appointments', label: 'My Appointments', icon: Calendar },
            { id: 'reminders', label: 'Daily Medicine Schedule', icon: Pill },
            { id: 'prescriptions', label: 'Live Doctor Prescriptions', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: active ? '#0284c7' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  boxShadow: active ? '0 4px 10px rgba(2, 132, 199, 0.25)' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* REQUIREMENT 2: AUTOMATIC BILL & INVOICE GENERATION SECTION                */}
        {/* ========================================================================= */}
        {(activeTab === 'bill' || activeTab === 'overview') && (
          <section id="patient-bill-invoice-section" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '2px solid #0284c7',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)',
            marginBottom: '28px'
          }}>
            {/* Header of Bill */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-block',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '4px 18px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                HOSPITAL INVOICE
              </div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                BILL
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Smart Hospital Consultation & Pharmacy Charges
              </p>
            </div>

            {/* Workflow Condition: ONLY AFTER doctor completes and submits a prescription */}
            {!hasPrescriptions ? (
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '28px 20px',
                border: '1px solid #e2e8f0',
                maxWidth: '560px',
                margin: '0 auto',
                textAlign: 'center'
              }}>
                <div style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <Receipt size={28} />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  No Generated Hospital Invoices Yet
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px 0', lineHeight: '1.5' }}>
                  An official Hospital Invoice is <strong>automatically generated</strong> as soon as your consulting doctor completes your appointment and submits your prescription.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    onClick={() => navigate('/book-appointment')}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    + Book Consultation
                  </button>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View Appointments
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Multiple Prescriptions Selector (if patient has more than 1 visit) */}
                {prescriptions.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Select Invoice Visit:</span>
                    {prescriptions.map((p, idx) => (
                      <button
                        key={p._id || idx}
                        onClick={() => setSelectedInvoiceIdx(idx)}
                        style={{
                          backgroundColor: selectedInvoiceIdx === idx ? '#0284c7' : '#f1f5f9',
                          color: selectedInvoiceIdx === idx ? '#ffffff' : '#334155',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        #{idx + 1} - {p.doctor?.name || 'Doctor'} ({p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Visit'})
                      </button>
                    ))}
                  </div>
                )}

                {/* The Generated Invoice Card Container matching user's reference exactly */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  maxWidth: '520px',
                  margin: '0 auto',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  {/* Patient Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    <span>Patient Name:</span>
                    <strong style={{ color: '#0f172a' }}>{user?.name || currentPrescription.patientName || 'Patient'}</strong>
                  </div>

                  {/* Doctor Consultation */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    <span>Doctor Consultation:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {currentPrescription.doctor?.name || currentPrescription.doctorId?.name || 'Dr. Sarah Smith'}
                    </strong>
                  </div>

                  {/* Diagnosed assessment */}
                  {currentPrescription.diagnosis && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                      <span>Clinical Diagnosis:</span>
                      <strong style={{ color: '#0284c7' }}>{currentPrescription.diagnosis}</strong>
                    </div>
                  )}

                  {/* Hospital UPI VPA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    <span>Hospital UPI VPA:</span>
                    <strong style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '13px' }}>krishna4u.rn@oksbi</strong>
                  </div>

                  {/* Billing Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                    <span>Billing Date:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {currentPrescription.createdAt ? new Date(currentPrescription.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                    </strong>
                  </div>

                  {/* Itemized Breakdown */}
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', marginBottom: '12px' }}>
                    {/* Consultation Fee */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#334155' }}>
                      <span>Doctor Consultation Fee</span>
                      <span style={{ fontWeight: '700' }}>₹{currentBill?.consultationFee || 150}.00</span>
                    </div>

                    {/* Pharmacy & Prescriptions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px', color: '#334155' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Pharmacy & Prescriptions
                        <button
                          type="button"
                          onClick={() => setShowItemizedPharmacy(!showItemizedPharmacy)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '0 4px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          {showItemizedPharmacy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </span>
                      <span style={{ fontWeight: '700' }}>₹{currentBill?.pharmacyFee || 350}.00</span>
                    </div>

                    {/* Expandable itemized pharmacy breakdown */}
                    {showItemizedPharmacy && (
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: '700', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
                          CALCULATED MEDICINE CHARGES:
                        </div>
                        {Array.isArray(currentPrescription.medicines) && currentPrescription.medicines.map((m, mIdx) => {
                          const tabs = Number(m.tablets) || 10;
                          const price = m.totalCost || Math.max(50, tabs * (m.pricePerUnit || 15));
                          return (
                            <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', padding: '2px 0' }}>
                              <span>• {m.name} ({tabs} tabs)</span>
                              <span style={{ fontWeight: '600' }}>₹{price}.00</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Hospital Registration Fee */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#334155' }}>
                      <span>Hospital Registration & Processing Fee</span>
                      <span style={{ fontWeight: '700' }}>₹{currentBill?.registrationFee || 50}.00</span>
                    </div>
                  </div>

                  {/* Solid dark line + Total Amount Due */}
                  <div style={{
                    borderTop: '2px solid #0f172a',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#0f172a'
                  }}>
                    <span>Total Amount Due:</span>
                    <span style={{ color: '#0284c7' }}>₹{currentBill?.totalAmount || 550}.00</span>
                  </div>

                  {/* Payment Button / Paid Status */}
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    {isInvoicePaid ? (
                      <div style={{
                        backgroundColor: '#dcfce7',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        padding: '16px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800' }}>
                          <CheckCircle size={22} color="#16a34a" /> INVOICE PAID & SETTLED VIA UPI
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', fontFamily: 'monospace' }}>
                          UTR Ref: {currentBill?.paymentDetails?.transactionId || '429184029184'} • VPA: krishna4u.rn@oksbi
                        </div>
                        <div style={{ fontSize: '11px', color: '#4b5563' }}>
                          Settlement Cleared on: {currentBill?.paymentDetails?.paidAt ? new Date(currentBill.paymentDetails.paidAt).toLocaleString() : new Date().toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;
                            const docName = currentPrescription.doctor?.name || currentPrescription.doctorId?.name || 'Dr. Consultant';
                            const docSpec = currentPrescription.doctor?.specialization || currentPrescription.doctorId?.specialization || 'Medical Specialist';
                            const utr = currentBill?.paymentDetails?.transactionId || '429184029184';
                            const amt = currentBill?.totalAmount || 550;
                            printWindow.document.write(`
                              <html>
                              <head><title>Hospital Invoice - ${utr}</title>
                              <style>
                                body { font-family: system-ui, sans-serif; padding: 40px; color: #0f172a; max-width: 650px; margin: 0 auto; }
                                .head { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
                                .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 13px; }
                                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
                                td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
                                .bold { font-weight: bold; }
                              </style>
                              </head>
                              <body>
                                <div class="head">
                                  <h2>🏥 SMART HOSPITAL & RESEARCH CENTRE</h2>
                                  <p>Official Patient Consultation & Pharmacy Tax Invoice</p>
                                  <span class="badge">✓ PAID IN FULL VIA UPI</span>
                                </div>
                                <table>
                                  <tr><td>Patient Name:</td><td class="bold">${user?.name || 'Patient'}</td></tr>
                                  <tr><td>Consultant Doctor:</td><td class="bold">${docName} (${docSpec})</td></tr>
                                  <tr><td>Merchant VPA:</td><td class="bold">krishna4u.rn@oksbi</td></tr>
                                  <tr><td>Transaction UTR:</td><td class="bold">${utr}</td></tr>
                                  <tr><td>Consultation Fee:</td><td>₹${currentBill?.consultationFee || 150}.00</td></tr>
                                  <tr><td>Pharmacy & Medicines:</td><td>₹${currentBill?.pharmacyFee || 350}.00</td></tr>
                                  <tr><td>Registration Fee:</td><td>₹${currentBill?.registrationFee || 50}.00</td></tr>
                                  <tr style="background:#f8fafc;"><td class="bold">Total Settled:</td><td class="bold" style="color:#16a34a; font-size:18px;">₹${amt}.00</td></tr>
                                </table>
                                <p style="font-size:12px; color:#64748b; text-align:center;">Computer generated invoice. Zero convenience fee.</p>
                                <script>window.onload = function() { window.print(); }</script>
                              </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }}
                          style={{
                            marginTop: '6px',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Printer size={15} /> Download PDF / Print Invoice
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedPaymentTarget({ type: 'invoice', data: currentPrescription })}
                        style={{
                          width: '100%',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '14px',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <CreditCard size={18} /> Pay ₹{currentBill?.totalAmount || 550}.00 via UPI Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION: DAILY MEDICINE SCHEDULE & REMINDERS                              */}
        {/* ========================================================================= */}
        {(activeTab === 'reminders' || activeTab === 'overview') && (
          <section id="medicine-schedule-section" style={{
            backgroundColor: '#0284c7',
            borderRadius: '16px',
            padding: '24px',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={22} /> Daily Medicine Schedule & Interactive Reminders
              </h3>
              <span style={{ fontSize: '12px', opacity: 0.9, backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                🔔 Native Web Push Active
              </span>
            </div>

            {/* Chrome Browser Push Notification Controls & Test Triggers */}
            <ChromeMedicineReminderCard
              schedule={medicineSchedule}
              onScheduleFocus={handleScheduleFocus}
              onTimesUpdated={(updated) => setCustomReminderTimes(updated)}
              highlightedSlot={highlightedSlot}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              
              {/* MORNING BOX */}
              <div style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                border: highlightedSlot === 'Morning' ? '3px solid #f59e0b' : '2px solid #38bdf8',
                boxShadow: highlightedSlot === 'Morning' ? '0 0 0 4px #fde68a, 0 10px 20px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  fontSize: '14px',
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sun size={18} /> Morning Dose
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#fde68a', color: '#78350f', padding: '2px 6px', borderRadius: '4px' }}>
                    ⏰ {formatSlotTime(customReminderTimes.morning)}
                  </span>
                </div>
                {medicineSchedule.morning.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>No morning medicines scheduled</div>
                ) : (
                  medicineSchedule.morning.map((med) => {
                    const key = `m-${med.id}`;
                    const isTaken = !!takenTracker[key];
                    return (
                      <div
                        key={key}
                        onClick={() => toggleMedicineTaken(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isTaken ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${isTaken ? '#86efac' : '#e2e8f0'}`,
                          marginBottom: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', textDecoration: isTaken ? 'line-through' : 'none', color: isTaken ? '#166534' : '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💊 {med.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{med.dosage}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isTaken}
                          onChange={() => {}}
                          style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* EVENING / AFTERNOON BOX */}
              <div style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                border: (highlightedSlot === 'Afternoon' || highlightedSlot === 'Evening') ? '3px solid #0284c7' : '2px solid #38bdf8',
                boxShadow: (highlightedSlot === 'Afternoon' || highlightedSlot === 'Evening') ? '0 0 0 4px #bae6fd, 0 10px 20px rgba(2, 132, 199, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  fontSize: '14px',
                  color: '#0369a1',
                  backgroundColor: '#e0f2fe',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sunset size={18} /> Afternoon Dose
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#bae6fd', color: '#075985', padding: '2px 6px', borderRadius: '4px' }}>
                    ⏰ {formatSlotTime(customReminderTimes.afternoon)}
                  </span>
                </div>
                {medicineSchedule.evening.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>No evening medicines scheduled</div>
                ) : (
                  medicineSchedule.evening.map((med) => {
                    const key = `e-${med.id}`;
                    const isTaken = !!takenTracker[key];
                    return (
                      <div
                        key={key}
                        onClick={() => toggleMedicineTaken(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isTaken ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${isTaken ? '#86efac' : '#e2e8f0'}`,
                          marginBottom: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', textDecoration: isTaken ? 'line-through' : 'none', color: isTaken ? '#166534' : '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💊 {med.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{med.dosage}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isTaken}
                          onChange={() => {}}
                          style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* NIGHT BOX */}
              <div style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                border: highlightedSlot === 'Night' ? '3px solid #9333ea' : '2px solid #38bdf8',
                boxShadow: highlightedSlot === 'Night' ? '0 0 0 4px #e9d5ff, 0 10px 20px rgba(147, 51, 234, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  fontSize: '14px',
                  color: '#6b21a8',
                  backgroundColor: '#f3e8ff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Moon size={18} /> Night Dose
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#e9d5ff', color: '#581c87', padding: '2px 6px', borderRadius: '4px' }}>
                    ⏰ {formatSlotTime(customReminderTimes.night)}
                  </span>
                </div>
                {medicineSchedule.night.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>No night medicines scheduled</div>
                ) : (
                  medicineSchedule.night.map((med) => {
                    const key = `n-${med.id}`;
                    const isTaken = !!takenTracker[key];
                    return (
                      <div
                        key={key}
                        onClick={() => toggleMedicineTaken(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isTaken ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${isTaken ? '#86efac' : '#e2e8f0'}`,
                          marginBottom: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', textDecoration: isTaken ? 'line-through' : 'none', color: isTaken ? '#166534' : '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💊 {med.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{med.dosage}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isTaken}
                          onChange={() => {}}
                          style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION: SCHEDULED APPOINTMENTS TABLE                                     */}
        {/* ========================================================================= */}
        {(activeTab === 'appointments' || activeTab === 'overview') && (
          <section id="patient-appointments-section" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#0284c7" /> Scheduled Appointments
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => navigate('/book-appointment')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <PlusCircle size={14} /> Book New
                </button>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  Total: {appointments.length}
                </span>
              </div>
            </div>

            {loading ? (
              <p style={{ color: '#64748b' }}>Loading appointments...</p>
            ) : (!Array.isArray(appointments) || appointments.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px 0' }}>
                  No appointments scheduled yet.
                </p>
                <button
                  onClick={() => navigate('/book-appointment')}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  + Book First Appointment
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '12px' }}>Doctor & Speciality</th>
                      <th style={{ padding: '12px' }}>Date & Slot</th>
                      <th style={{ padding: '12px' }}>Symptoms</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Invoice / Bill Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((app) => {
                      const docName = app.doctorId?.name || app.doctor?.name || 'Dr. Specialist';
                      const docSpec = app.doctorId?.specialization || app.doctor?.specialization || 'General Medicine';
                      const appPaid = app.paymentStatus === 'Paid' || app.paymentStatus === 'Completed';

                      return (
                        <tr key={app._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{docName}</div>
                            <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>{docSpec}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>{app.date ? app.date.split('T')[0] : 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> {app.timeSlot || app.time || '10:00 AM'}
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            {app.symptoms || 'General Checkup'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: app.status === 'Completed' ? '#dcfce7' : '#e0f2fe',
                              color: app.status === 'Completed' ? '#15803d' : '#0369a1'
                            }}>
                              {app.status || 'Confirmed'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {app.status === 'Completed' ? (
                              <button
                                onClick={() => setActiveTab('bill')}
                                style={{
                                  backgroundColor: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Receipt size={14} /> View Invoice
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Auto-generates post visit
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION: LIVE PRESCRIPTIONS SHEET VIEW                                    */}
        {/* ========================================================================= */}
        {(activeTab === 'prescriptions' || activeTab === 'overview') && (
          <section id="patient-live-prescriptions-section" style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#0284c7" /> Live Prescriptions (Doctor Sheet View)
              </h3>
              <span style={{ fontSize: '11px', color: '#15803d', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>
                ● Live WebSocket Synced
              </span>
            </div>

            {loading ? (
              <p style={{ color: '#64748b' }}>Loading prescriptions...</p>
            ) : (!Array.isArray(prescriptions) || prescriptions.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  No prescriptions issued yet. When your doctor issues one, it will appear here and auto-generate your bill!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {prescriptions.map((pres) => {
                  const docName = pres.doctor?.name || pres.doctorId?.name || 'Dr. Specialist';
                  const docSpec = pres.doctor?.specialization || pres.doctorId?.specialization || 'Cardiology';

                  return (
                    <div
                      key={pres._id}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '20px',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '12px',
                        marginBottom: '14px'
                      }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                            {docName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>
                            {docSpec} | Diagnosis: <strong style={{ color: '#334155' }}>{pres.diagnosis || 'Clinical Assessment'}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Date: {pres.createdAt ? new Date(pres.createdAt).toLocaleDateString() : 'Today'}
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '6px 10px' }}>Medicine Name</th>
                              <th style={{ padding: '6px 10px' }}>Dosage</th>
                              <th style={{ padding: '6px 10px' }}>Tablets</th>
                              <th style={{ padding: '6px 10px' }}>Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(pres.medicines) && pres.medicines.map((med, idx) => {
                              const medTitle = med.name || med.medicineName || 'Medicine';
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                  <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>💊 {medTitle}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setGoogleSearchQuery(medTitle);
                                          setGoogleSearchModalOpen(true);
                                        }}
                                        title={`Google search details for ${medTitle}`}
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
                                  </td>
                                  <td style={{ padding: '6px 10px', color: '#475569' }}>
                                    {med.dosage || '1 tablet'}
                                  </td>
                                  <td style={{ padding: '6px 10px', fontWeight: '600', color: '#334155' }}>
                                    {med.tablets ? `${med.tablets} tablets` : 'As advised'}
                                  </td>
                                  <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                    {med.instructions || 'After meal'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* UPI Payment Modal (Supports both Invoices and Appointments) */}
      <UpiPaymentModal
        isOpen={!!selectedPaymentTarget}
        onClose={() => setSelectedPaymentTarget(null)}
        invoice={selectedPaymentTarget?.type === 'invoice' ? selectedPaymentTarget.data : null}
        appointment={selectedPaymentTarget?.type === 'appointment' ? selectedPaymentTarget.data : null}
        onPaymentSuccess={fetchPatientData}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Medical History Modal */}
      <MedicalHistoryModal
        isOpen={isMedicalHistoryOpen}
        onClose={() => setIsMedicalHistoryOpen(false)}
        user={user}
        prescriptions={prescriptions}
        appointments={appointments}
      />

      {/* In-app Google Medicine Search Modal */}
      <GoogleMedicineSearchModal
        isOpen={googleSearchModalOpen}
        onClose={() => setGoogleSearchModalOpen(false)}
        initialQuery={googleSearchQuery}
      />
    </div>
  );
};

export default PatientDashboard;
