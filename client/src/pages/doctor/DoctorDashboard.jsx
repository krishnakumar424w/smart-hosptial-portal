import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getDoctorAppointments, getAllInventory, updateAppointmentStatus } from '../../services/api';
import { initSocket, subscribeToAppointments } from '../../services/socket';
import TopHeader from '../../components/TopHeader';
import PrescriptionSheetModal from '../../components/PrescriptionSheetModal';
import GoogleMedicineSearchModal from '../../components/GoogleMedicineSearchModal';
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  User,
  Activity,
  Phone,
  Heart,
  Pill,
  Search,
  AlertTriangle,
  Package,
  Layers,
  Zap,
  Radio,
  XCircle,
  PlayCircle
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [activeView, setActiveView] = useState('both'); // 'both', 'appointments', 'stock'
  const [realtimeBookingAlert, setRealtimeBookingAlert] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [googleSearchModalOpen, setGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchInventory();

    // Initialize Socket.IO connection and join doctor room
    initSocket(user);

    // Subscribe to real-time appointment events
    const unsubscribe = subscribeToAppointments({
      onCreated: (newApp) => {
        if (!newApp) return;
        const targetDocId = typeof newApp.doctorId === 'object' ? newApp.doctorId?._id : newApp.doctorId;

        if (!user?._id || String(targetDocId) === String(user._id) || !targetDocId) {
          setAppointments((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.some((a) => a._id === newApp._id)) return arr;
            return [newApp, ...arr];
          });

          const patName = newApp.patientId?.name || newApp.patient?.name || 'Patient';
          setRealtimeBookingAlert({
            id: Date.now(),
            patientName: patName,
            timeSlot: newApp.timeSlot || 'Scheduled time',
            date: newApp.date ? newApp.date.split('T')[0] : 'Today'
          });
        }
      },
      onUpdated: (updatedApp) => {
        if (!updatedApp) return;
        const targetDocId = typeof updatedApp.doctorId === 'object' ? updatedApp.doctorId?._id : updatedApp.doctorId;

        if (!user?._id || String(targetDocId) === String(user._id) || !targetDocId) {
          setAppointments((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.map((a) => (a._id === updatedApp._id ? { ...a, ...updatedApp } : a));
          });
        }
      },
      onStatusChanged: (statusData) => {
        if (!statusData) return;
        setAppointments((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map((a) => (a._id === statusData.appointmentId ? { ...a, status: statusData.status } : a));
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?._id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await getDoctorAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setStockLoading(true);
      const { data } = await getAllInventory();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load hospital inventory:', err);
      setMedicines([]);
    } finally {
      setStockLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      setActionLoadingId(appId);
      const { data } = await updateAppointmentStatus(appId, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status: data.status || newStatus } : a))
      );
      setMessage(`Appointment marked as "${newStatus}" and broadcasted live to patient.`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error('Failed to update status:', err);
      setMessage('Failed to update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePrescriptionCreated = () => {
    setMessage('Prescription issued successfully! Broadcasted in real-time to patient and pharmacy inventory updated.');
    fetchAppointments();
    fetchInventory();
  };

  const categories = ['All', ...new Set(medicines.map((m) => m.category).filter(Boolean))];

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const inStockCount = medicines.filter((m) => (m.quantity || 0) > 50).length;
  const lowStockCount = medicines.filter((m) => (m.quantity || 0) > 0 && (m.quantity || 0) <= 20).length;
  const outOfStockCount = medicines.filter((m) => (m.quantity || 0) <= 0).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <TopHeader title="Doctor Clinical Dashboard" />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Real-time Booking Banner */}
        {realtimeBookingAlert && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '6px', borderRadius: '50%' }}>
                <Zap size={18} />
              </div>
              <div style={{ fontSize: '13px', color: '#1e40af' }}>
                <strong>Live New Booking:</strong> Patient <strong>{realtimeBookingAlert.patientName}</strong> has just booked an appointment for <strong>{realtimeBookingAlert.date} ({realtimeBookingAlert.timeSlot})</strong>. Automatically added below!
              </div>
            </div>
            <button
              onClick={() => setRealtimeBookingAlert(null)}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* Doctor Welcome & Status Controls */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
              Welcome back, Dr. {user?.name || 'Practitioner'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Specialization: <strong>{user?.specialization || 'Cardiologist / General Medicine'}</strong> | Degree: <strong>{user?.degree || user?.qualification || 'MBBS, MD'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#166534'
            }}>
              <Radio size={12} color="#16a34a" /> Live WebSocket Sync
            </div>

            <button
              onClick={() => { fetchAppointments(); fetchInventory(); }}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} /> {message}
          </div>
        )}

        {/* Doctor Appointments Queue */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#0284c7" /> Patient Consultation Queue
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Manage live patient bookings, update statuses, or generate instant prescriptions with automated hospital billing.
              </p>
            </div>
            <span style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {appointments.length} Total Patients
            </span>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px' }}>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px', padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              No patient appointments assigned for today.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Patient Profile</th>
                    <th style={{ padding: '12px' }}>Contact</th>
                    <th style={{ padding: '12px' }}>Date & Slot</th>
                    <th style={{ padding: '12px' }}>Symptoms</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Live Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((app) => {
                    const patName = app.patientId?.name || app.patient?.name || 'Patient';
                    const patAge = app.patientId?.age || app.patient?.age || '30';
                    const patGender = app.patientId?.gender || app.patient?.gender || 'M';
                    const patBlood = app.patientId?.bloodGroup || app.patient?.bloodGroup || 'O+';
                    const patPhone = app.patientId?.phone || app.patient?.phone || '555-0199';
                    const isCompleted = app.status === 'Completed';

                    return (
                      <tr key={app._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                            {patName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <span>{patAge} yrs, {patGender}</span>
                            <span>•</span>
                            <span style={{ color: '#dc2626', fontWeight: '600' }}>Blood: {patBlood}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} color="#64748b" /> {patPhone}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{app.date ? app.date.split('T')[0] : 'N/A'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> {app.timeSlot || app.time || '10:00 AM'}
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#475569', maxWidth: '200px' }}>
                          {app.symptoms || 'General Consultation'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor:
                              app.status === 'Completed' ? '#dcfce7' :
                              app.status === 'Confirmed' ? '#e0f2fe' :
                              app.status === 'In-Progress' ? '#fef3c7' :
                              app.status === 'Cancelled' ? '#fee2e2' : '#f1f5f9',
                            color:
                              app.status === 'Completed' ? '#15803d' :
                              app.status === 'Confirmed' ? '#0369a1' :
                              app.status === 'In-Progress' ? '#b45309' :
                              app.status === 'Cancelled' ? '#b91c1c' : '#475569'
                          }}>
                            {app.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {!isCompleted && app.status !== 'Confirmed' && app.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleStatusChange(app._id, 'Confirmed')}
                                disabled={actionLoadingId === app._id}
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <CheckCircle size={12} /> Confirm
                              </button>
                            )}

                            {!isCompleted && app.status !== 'In-Progress' && app.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleStatusChange(app._id, 'In-Progress')}
                                disabled={actionLoadingId === app._id}
                                style={{
                                  backgroundColor: '#f59e0b',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <PlayCircle size={12} /> Start
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedAppointment(app)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: isCompleted ? '#475569' : '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <FileText size={12} /> {isCompleted ? 'View Prescription' : 'Prescription'}
                            </button>

                            {!isCompleted && app.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleStatusChange(app._id, 'Cancelled')}
                                disabled={actionLoadingId === app._id}
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #fca5a5',
                                  color: '#dc2626',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Hospital Pharmacy Inventory Section */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#0284c7" /> Hospital Pharmacy Stock Overview
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Real-time visibility into medicine stock levels to prescribe available drugs safely.
              </p>
            </div>

            {/* Quick stock badges */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                {inStockCount} In Stock
              </span>
              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                {lowStockCount} Low Stock
              </span>
              <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                {outOfStockCount} Out of Stock
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search medicines by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#ffffff'
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Table */}
          {stockLoading ? (
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Loading medicine inventory...</p>
          ) : filteredMedicines.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No medicines found.</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '10px' }}>Medicine Name</th>
                    <th style={{ padding: '10px' }}>Category</th>
                    <th style={{ padding: '10px' }}>Dosage Form</th>
                    <th style={{ padding: '10px' }}>Unit Price</th>
                    <th style={{ padding: '10px' }}>Available Stock</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((m) => {
                    const qty = m.quantity || 0;
                    const status = qty <= 0 ? 'Out of Stock' : qty <= 20 ? 'Low Stock' : 'In Stock';
                    const badgeBg = qty <= 0 ? '#fee2e2' : qty <= 20 ? '#fef3c7' : '#dcfce7';
                    const badgeColor = qty <= 0 ? '#b91c1c' : qty <= 20 ? '#b45309' : '#15803d';

                    return (
                      <tr key={m._id || m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{m.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setGoogleSearchQuery(m.name);
                                setGoogleSearchModalOpen(true);
                              }}
                              title={`Google search details for ${m.name}`}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: '#2563eb',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}
                            >
                              <Search size={11} /> Google Info
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px', color: '#475569' }}>{m.category || 'General'}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{m.dosageForm || 'Tablet (500mg)'}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: '#0284c7' }}>₹{m.pricePerUnit || 15}</td>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#334155' }}>{qty} units</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: badgeBg,
                            color: badgeColor
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Prescription Sheet Modal */}
      <PrescriptionSheetModal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onPrescriptionCreated={handlePrescriptionCreated}
      />

      {/* Google Medicine Search Modal */}
      <GoogleMedicineSearchModal
        isOpen={googleSearchModalOpen}
        onClose={() => setGoogleSearchModalOpen(false)}
        initialQuery={googleSearchQuery}
      />
    </div>
  );
};

export default DoctorDashboard;
