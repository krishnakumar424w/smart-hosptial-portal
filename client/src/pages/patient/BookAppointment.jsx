import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getAllDoctors, bookAppointment, getDoctorAvailability } from '../../services/api';
import { subscribeToAppointments, emitAppointmentCreated, emitSlotBooked } from '../../services/socket';
import {
  ALL_10MIN_SLOTS,
  MORNING_SLOTS,
  AFTERNOON_SLOTS,
  EVENING_SLOTS,
  isSlotMatch
} from '../../utils/timeSlots';
import TopHeader from '../../components/TopHeader';
import UserAvatar from '../../components/UserAvatar';
import {
  Search,
  UserCheck,
  Calendar,
  Clock,
  ArrowLeft,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  Radio,
  Lock,
  Zap,
  Sun,
  Sunset,
  Moon,
  Filter,
  Check
} from 'lucide-react';

const BookAppointment = () => {
  const { user } = useContext(AuthContext);
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Set default date to tomorrow
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    doctorId: '',
    date: getTomorrowDate(),
    timeSlot: '10:00 - 10:10 AM',
    symptoms: '',
    isEmergency: false
  });

  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [activeSession, setActiveSession] = useState('all'); // 'all', 'morning', 'afternoon', 'evening'
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [slotSearch, setSlotSearch] = useState('');
  const [liveBookingAlert, setLiveBookingAlert] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctorsList();
  }, []);

  // Fetch booked slots whenever selected doctor or date changes
  useEffect(() => {
    if (formData.doctorId && formData.date) {
      fetchSlotAvailability(formData.doctorId, formData.date);
    }
  }, [formData.doctorId, formData.date]);

  // Subscribe to real-time doctor availability & slot:booked events via WebSocket
  useEffect(() => {
    const unsubscribe = subscribeToAppointments({
      // 1. Specific slot:booked handler for instant real-time locking
      onSlotBooked: (data) => {
        if (!data) return;
        const targetDocId = typeof data.doctorId === 'object' ? data.doctorId._id : data.doctorId;
        const targetDate = typeof data.date === 'string' ? data.date.split('T')[0] : '';
        const curDate = typeof formData.date === 'string' ? formData.date.split('T')[0] : '';

        if (String(targetDocId) === String(formData.doctorId) && targetDate === curDate) {
          const bookedTime = data.slotTime || data.timeSlot;
          if (bookedTime) {
            setBookedSlots((prev) => {
              if (prev.some((s) => isSlotMatch(s, bookedTime))) return prev;
              return [...prev, bookedTime];
            });

            const patientWhoBooked = data.bookedBy ? `by ${data.bookedBy}` : 'by another patient';
            setLiveBookingAlert(`⚡ Slot "${bookedTime}" was just locked & booked ${patientWhoBooked} in real-time.`);
            setTimeout(() => setLiveBookingAlert(''), 6000);

            // If the patient currently has this exact slot highlighted, automatically switch to next free slot
            if (isSlotMatch(formData.timeSlot, bookedTime)) {
              const freeSlot = ALL_10MIN_SLOTS.find(
                (s) => !isSlotMatch(s, bookedTime) && !bookedSlots.some((b) => isSlotMatch(b, s))
              );
              if (freeSlot) {
                setFormData((f) => ({ ...f, timeSlot: freeSlot }));
                setError(`Note: The slot you were viewing (${bookedTime}) was just booked. Switched your selection to ${freeSlot}.`);
              }
            }
          }
        }
      },

      // 2. Doctor general availability updated handler
      onAvailabilityUpdated: (data) => {
        if (!data) return;
        const targetDocId = typeof data.doctorId === 'object' ? data.doctorId._id : data.doctorId;
        const targetDate = typeof data.date === 'string' ? data.date.split('T')[0] : '';
        const curDate = typeof formData.date === 'string' ? formData.date.split('T')[0] : '';

        if (String(targetDocId) === String(formData.doctorId) && targetDate === curDate) {
          if (data.bookedSlots && Array.isArray(data.bookedSlots)) {
            setBookedSlots(data.bookedSlots);
          } else if (data.timeSlot) {
            setBookedSlots((prev) => {
              if (prev.some((s) => isSlotMatch(s, data.timeSlot))) return prev;
              return [...prev, data.timeSlot];
            });
          }
        }
      },

      // 3. Appointment created event
      onCreated: (newApp) => {
        if (!newApp) return;
        const targetDocId = typeof newApp.doctorId === 'object' ? newApp.doctorId._id : newApp.doctorId;
        const targetDate = typeof newApp.date === 'string' ? newApp.date.split('T')[0] : '';
        const curDate = typeof formData.date === 'string' ? formData.date.split('T')[0] : '';

        if (String(targetDocId) === String(formData.doctorId) && targetDate === curDate && newApp.timeSlot) {
          setBookedSlots((prev) => {
            if (prev.some((s) => isSlotMatch(s, newApp.timeSlot))) return prev;
            return [...prev, newApp.timeSlot];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [formData.doctorId, formData.date, formData.timeSlot, bookedSlots]);

  const fetchDoctorsList = async () => {
    try {
      const { data } = await getAllDoctors();
      const docs = data || [];
      setDoctors(docs);
      if (docs.length > 0 && !formData.doctorId) {
        setSelectedDoctor(docs[0]);
        setFormData((prev) => ({ ...prev, doctorId: docs[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load doctors list:', err);
      setError('Failed to load doctors list from server.');
    }
  };

  const fetchSlotAvailability = async (docId, dateStr) => {
    try {
      setSlotLoading(true);
      const { data } = await getDoctorAvailability(docId, dateStr);
      if (data && Array.isArray(data.bookedSlots)) {
        setBookedSlots(data.bookedSlots);

        // If current slot is booked, auto-select next available 10-minute interval
        const currentIsBooked = data.bookedSlots.some((b) => isSlotMatch(b, formData.timeSlot));
        if (currentIsBooked) {
          const firstFree = ALL_10MIN_SLOTS.find(
            (s) => !data.bookedSlots.some((b) => isSlotMatch(b, s))
          );
          if (firstFree) {
            setFormData((prev) => ({ ...prev, timeSlot: firstFree }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch slot availability:', err);
    } finally {
      setSlotLoading(false);
    }
  };

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const parseSlotEndDate = (slot, dateStr) => {
    if (!slot || !dateStr) return null;

    const match = String(slot).match(/(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    const [, startTime, startMeridiem, endTime, endMeridiem] = match;
    const parseTimeToMinutes = (time, meridiem) => {
      const [hours, minutes] = time.split(':').map(Number);
      let parsedHours = hours;
      if (meridiem.toUpperCase() === 'AM' && parsedHours === 12) parsedHours = 0;
      if (meridiem.toUpperCase() === 'PM' && parsedHours !== 12) parsedHours += 12;
      return parsedHours * 60 + minutes;
    };

    const endMinutes = parseTimeToMinutes(endTime, endMeridiem);
    const date = new Date(dateStr + 'T00:00:00');
    date.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    return date;
  };

  const isPastSlotForDate = (slot, dateStr) => {
    if (!slot || !dateStr) return false;
    const todayString = getTodayDateString();
    if (dateStr !== todayString) return false;

    const now = new Date();
    const slotEnd = parseSlotEndDate(slot, dateStr);
    if (!slotEnd) return false;

    return slotEnd.getTime() <= now.getTime();
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = doc.name.toLowerCase().includes(q);
    const specMatch = (doc.specialization || '').toLowerCase().includes(q);
    const degMatch = (doc.degree || doc.qualification || '').toLowerCase().includes(q);
    return nameMatch || specMatch || degMatch;
  });

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setFormData({ ...formData, doctorId: doc._id });
  };

  // Helper to check if a 10-minute slot is booked
  const isSlotBooked = (slot) => {
    return bookedSlots.some((b) => isSlotMatch(b, slot));
  };

  // Filter slots based on active session, availability, and today's expired slots
  const visibleSlots = useMemo(() => {
    let slots = ALL_10MIN_SLOTS;
    if (activeSession === 'morning') slots = MORNING_SLOTS;
    else if (activeSession === 'afternoon') slots = AFTERNOON_SLOTS;
    else if (activeSession === 'evening') slots = EVENING_SLOTS;

    slots = slots.filter((slot) => !isPastSlotForDate(slot, formData.date));

    if (onlyAvailable) {
      slots = slots.filter((s) => !isSlotBooked(s));
    }

    if (slotSearch.trim()) {
      const q = slotSearch.toLowerCase().trim();
      slots = slots.filter((s) => s.toLowerCase().includes(q));
    }

    return slots;
  }, [activeSession, onlyAvailable, slotSearch, bookedSlots, formData.date]);

  // Session stats calculations
  const morningBookedCount = MORNING_SLOTS.filter((slot) => isSlotBooked(slot) || isPastSlotForDate(slot, formData.date)).length;
  const afternoonBookedCount = AFTERNOON_SLOTS.filter((slot) => isSlotBooked(slot) || isPastSlotForDate(slot, formData.date)).length;
  const eveningBookedCount = EVENING_SLOTS.filter((slot) => isSlotBooked(slot) || isPastSlotForDate(slot, formData.date)).length;
  const totalBookedCount = ALL_10MIN_SLOTS.filter((slot) => isSlotBooked(slot) || isPastSlotForDate(slot, formData.date)).length;
  const totalAvailableCount = ALL_10MIN_SLOTS.filter((slot) => !isSlotBooked(slot) && !isPastSlotForDate(slot, formData.date)).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctorId) {
      setError('Please select a doctor from the list.');
      return;
    }

    if (isPastSlotForDate(formData.timeSlot, formData.date)) {
      setError(`Slot ${formData.timeSlot} has already passed for today. Please select a future available time.`);
      return;
    }

    if (isSlotBooked(formData.timeSlot)) {
      setError(`Slot ${formData.timeSlot} has already been reserved. Please select another 10-minute time slot.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: createdAppointment } = await bookAppointment(formData);

      // Instantly notify all connected WebSocket clients with slot:booked and appointment:created
      emitSlotBooked({
        doctorId: formData.doctorId,
        date: formData.date,
        slotTime: formData.timeSlot,
        bookedBy: user?.name || 'Patient'
      });
      emitAppointmentCreated(createdAppointment);

      setSuccess(`Consultation confirmed for ${formData.timeSlot} on ${formData.date}! Real-time slot locking active.`);
      setTimeout(() => navigate('/patient-dashboard'), 1200);
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response?.data?.message || 'Slot concurrency conflict: This 10-minute slot was just booked by another patient.');
        if (err.response?.data?.bookedSlots) {
          setBookedSlots(err.response.data.bookedSlots);
        }
      } else {
        setError(err.response?.data?.message || 'Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <TopHeader title="Book Consultation" />

      <div style={{ maxWidth: '920px', margin: '24px auto', padding: '0 16px' }}>
        <button
          onClick={() => navigate('/patient-dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Header & Status Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                Book Doctor Consultation
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Select doctor & date. Choose from exact <strong>10-minute granular intervals</strong> with real-time WebSocket locking.
              </p>
            </div>

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
              <Radio size={12} color="#16a34a" /> Real-Time WebSocket Slot Sync
            </div>
          </div>

          {/* Live Real-Time Slot Booked Notification */}
          {liveBookingAlert && (
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '11px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'pulse 1.5s infinite'
            }}>
              <Zap size={18} color="#2563eb" />
              <span>{liveBookingAlert}</span>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Doctor Search & Selection */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                1. Select Doctor *
              </label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter doctor by name, speciality, or degree..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Doctor Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', maxHeight: '220px', overflowY: 'auto' }}>
                {filteredDoctors.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No doctor matches "{searchQuery}".
                  </div>
                ) : (
                  filteredDoctors.map((doc) => {
                    const isSelected = selectedDoctor?._id === doc._id;
                    const spec = doc.specialization || 'General Medicine';
                    const degree = doc.degree || doc.qualification || 'MBBS, MD';

                    return (
                      <div
                        key={doc._id}
                        onClick={() => handleSelectDoctor(doc)}
                        style={{
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                          borderRadius: '10px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <UserAvatar
                          src={doc.photo}
                          role="doctor"
                          name={doc.name}
                          size={46}
                          showBadge={true}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                            {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', marginTop: '2px' }}>
                            <Stethoscope size={12} style={{ display: 'inline', marginRight: '3px' }} />
                            {spec}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {degree} • ₹{doc.consultationFee || 150} Fee
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {selectedDoctor && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#166534',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <UserCheck size={18} /> Selected: <strong>{selectedDoctor.name} ({selectedDoctor.specialization || 'General Medicine'})</strong> • ₹{selectedDoctor.consultationFee || 150} Consultation Fee
              </div>
            )}

            {/* Step 2: Date Selection & Availability Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  2. Consultation Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  10-Min Granular Slot Status
                </label>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="#0284c7" />
                    <span>{slotLoading ? 'Checking schedule...' : `${totalAvailableCount} of ${ALL_10MIN_SLOTS.length} slots available`}</span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: totalAvailableCount > 0 ? '#dcfce7' : '#fee2e2',
                    color: totalAvailableCount > 0 ? '#15803d' : '#b91c1c'
                  }}>
                    {totalAvailableCount > 0 ? 'Open for Booking' : 'Fully Booked'}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Interactive 10-Minute Time Slots with Real-Time Lock & Session Tabs */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  3. Choose 10-Minute Time Slot *
                  <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>
                    (Selected: <strong style={{ color: '#0284c7' }}>{formData.timeSlot}</strong>)
                  </span>
                </label>

                {/* Filter & Available only toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Available only
                  </label>
                  <input
                    type="text"
                    placeholder="Search time..."
                    value={slotSearch}
                    onChange={(e) => setSlotSearch(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      width: '100px'
                    }}
                  />
                </div>
              </div>

              {/* Session Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSession('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: activeSession === 'all' ? '#0f172a' : '#ffffff',
                    borderColor: activeSession === 'all' ? '#0f172a' : '#cbd5e1',
                    color: activeSession === 'all' ? '#ffffff' : '#475569'
                  }}
                >
                  All Slots ({ALL_10MIN_SLOTS.length - totalBookedCount}/{ALL_10MIN_SLOTS.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSession('morning')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    backgroundColor: activeSession === 'morning' ? '#0284c7' : '#ffffff',
                    borderColor: activeSession === 'morning' ? '#0284c7' : '#cbd5e1',
                    color: activeSession === 'morning' ? '#ffffff' : '#475569'
                  }}
                >
                  <Sun size={13} /> Morning (09:00 AM - 12:00 PM) • {MORNING_SLOTS.length - morningBookedCount} Free
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSession('afternoon')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    backgroundColor: activeSession === 'afternoon' ? '#0284c7' : '#ffffff',
                    borderColor: activeSession === 'afternoon' ? '#0284c7' : '#cbd5e1',
                    color: activeSession === 'afternoon' ? '#ffffff' : '#475569'
                  }}
                >
                  <Sunset size={13} /> Afternoon (02:00 PM - 05:00 PM) • {AFTERNOON_SLOTS.length - afternoonBookedCount} Free
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSession('evening')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    backgroundColor: activeSession === 'evening' ? '#0284c7' : '#ffffff',
                    borderColor: activeSession === 'evening' ? '#0284c7' : '#cbd5e1',
                    color: activeSession === 'evening' ? '#ffffff' : '#475569'
                  }}
                >
                  <Moon size={13} /> Evening (05:30 PM - 07:30 PM) • {EVENING_SLOTS.length - eveningBookedCount} Free
                </button>
              </div>

              {/* 10-Minute Granular Chips Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '4px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                {visibleSlots.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No 10-minute slots match the selected filter.
                  </div>
                ) : (
                  visibleSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot);
                    const isExpired = isPastSlotForDate(slot, formData.date);
                    const isSelected = isSlotMatch(formData.timeSlot, slot) && !isBooked && !isExpired;
                    const isDisabled = isBooked || isExpired;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setFormData({ ...formData, timeSlot: slot })}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textAlign: 'center',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          border: isSelected
                            ? '2px solid #0284c7'
                            : isDisabled
                            ? '1px solid #e2e8f0'
                            : '1px solid #cbd5e1',
                          backgroundColor: isDisabled
                            ? '#f1f5f9'
                            : isSelected
                            ? '#0284c7'
                            : '#ffffff',
                          color: isDisabled
                            ? '#94a3b8'
                            : isSelected
                            ? '#ffffff'
                            : '#1e293b',
                          boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ letterSpacing: '-0.2px' }}>{slot}</span>
                        {isBooked ? (
                          <span style={{
                            fontSize: '10px',
                            color: '#b91c1c',
                            backgroundColor: '#fee2e2',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: '700'
                          }}>
                            <Lock size={10} /> Booked / Unavailable
                          </span>
                        ) : isExpired ? (
                          <span style={{
                            fontSize: '10px',
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: '700'
                          }}>
                            <Clock size={10} /> Passed / Unavailable
                          </span>
                        ) : isSelected ? (
                          <span style={{
                            fontSize: '10px',
                            color: '#ffffff',
                            backgroundColor: '#0369a1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: '700'
                          }}>
                            <Check size={10} /> Selected (10m)
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '10px',
                            color: '#16a34a',
                            fontWeight: '600'
                          }}>
                            • Available (10m)
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 4: Symptoms */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                4. Symptoms & Health Concerns *
              </label>
              <textarea
                required
                rows="3"
                placeholder="Describe patient symptoms (e.g. high fever, chronic cough, blood pressure checkup, cardiac evaluation)..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedDoctor || isSlotBooked(formData.timeSlot)}
              style={{
                width: '100%',
                backgroundColor: isSlotBooked(formData.timeSlot) ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '13px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isSlotBooked(formData.timeSlot) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                'Verifying Concurrency & Worker Validation...'
              ) : isSlotBooked(formData.timeSlot) ? (
                <>
                  <Lock size={18} /> Slot Already Booked — Please Select Another Slot
                </>
              ) : (
                <>
                  <Calendar size={18} /> Confirm {formData.timeSlot} & Broadcast Live
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
