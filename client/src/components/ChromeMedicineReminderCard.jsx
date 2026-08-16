import { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  Settings,
  ShieldCheck,
  RotateCcw,
  Save,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendMedicineNotification,
  playReminderChime,
  getStoredReminderTimes,
  saveStoredReminderTimes,
  DEFAULT_REMINDER_TIMES
} from '../services/notificationService';

const formatTime12Hour = (timeStr) => {
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

const ChromeMedicineReminderCard = ({
  schedule = { morning: [], evening: [], night: [] },
  onScheduleFocus = () => {},
  onTimesUpdated = () => {},
  highlightedSlot = null
}) => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(true);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [customTimes, setCustomTimes] = useState({
    morning: DEFAULT_REMINDER_TIMES.morning,
    afternoon: DEFAULT_REMINDER_TIMES.afternoon,
    night: DEFAULT_REMINDER_TIMES.night
  });

  useEffect(() => {
    const supported = isNotificationSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
    }

    // Load saved reminder times from localStorage
    const savedTimes = getStoredReminderTimes();
    setCustomTimes(savedTimes);
  }, []);

  const handleRequestPermission = async () => {
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        setAlertMessage('✅ Browser notification permission granted. If Windows does not show the popup, the app will still show an in-page reminder banner as a fallback.');
        setIsSavedSuccess(true);
        playReminderChime();
        sendMedicineNotification({
          timeSlot: 'Morning',
          medicines: schedule.morning && schedule.morning.length > 0 ? schedule.morning : [{ name: 'Paracetamol 500mg', dosage: '1 tablet after breakfast' }],
          onClickCallback: (slot) => onScheduleFocus(slot)
        });
      } else if (result === 'denied') {
        setAlertMessage('⚠️ Notification access was blocked. Please click the tune/lock icon in Chrome\'s address bar to allow notifications for this app.');
        setIsSavedSuccess(false);
      }
      setTimeout(() => {
        setAlertMessage('');
        setIsSavedSuccess(false);
      }, 6000);
    } catch (err) {
      console.error('Failed to request permission:', err);
    }
  };

  const handleTestNotification = (timeSlot) => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }

    let meds = [];
    if (timeSlot.toLowerCase().includes('morning')) {
      meds = schedule.morning && schedule.morning.length > 0 ? schedule.morning : [{ name: 'Paracetamol 500mg', dosage: '1 tablet after breakfast' }];
    } else if (timeSlot.toLowerCase().includes('afternoon') || timeSlot.toLowerCase().includes('evening')) {
      meds = schedule.evening && schedule.evening.length > 0 ? schedule.evening : [{ name: 'Amoxicillin 250mg', dosage: '1 capsule after lunch' }];
    } else {
      meds = schedule.night && schedule.night.length > 0 ? schedule.night : [{ name: 'Antacid / Pantoprazole 40mg', dosage: '1 tablet before bed' }];
    }

    const notif = sendMedicineNotification({
      timeSlot,
      medicines: meds,
      onClickCallback: (slot) => onScheduleFocus(slot)
    });

    if (notif) {
      setAlertMessage(`🚀 Triggered Chrome Desktop Alert for ${timeSlot} dose! Check your desktop popup.`);
      setIsSavedSuccess(true);
      setTimeout(() => {
        setAlertMessage('');
        setIsSavedSuccess(false);
      }, 5000);
    }
  };

  const handleTimeChange = (slot, value) => {
    setCustomTimes((prev) => ({
      ...prev,
      [slot]: value
    }));
  };

  const handleSaveReminderPreferences = (e) => {
    if (e) e.preventDefault();
    try {
      const saved = saveStoredReminderTimes(customTimes);
      setCustomTimes(saved);
      setAlertMessage('Reminder times updated! Your customized alert schedule is now active.');
      setIsSavedSuccess(true);
      if (typeof onTimesUpdated === 'function') {
        onTimesUpdated(saved);
      }
      playReminderChime();
      setTimeout(() => {
        setAlertMessage('');
        setIsSavedSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to save reminder preferences:', err);
      setAlertMessage('Failed to save reminder times to browser storage.');
      setIsSavedSuccess(false);
    }
  };

  const handleResetDefaults = () => {
    const defaultTimes = { ...DEFAULT_REMINDER_TIMES };
    setCustomTimes(defaultTimes);
    saveStoredReminderTimes(defaultTimes);
    setAlertMessage('Reminder times reset to defaults (08:00 AM, 01:00 PM, 08:00 PM).');
    setIsSavedSuccess(true);
    if (typeof onTimesUpdated === 'function') {
      onTimesUpdated(defaultTimes);
    }
    setTimeout(() => {
      setAlertMessage('');
      setIsSavedSuccess(false);
    }, 4000);
  };

  if (!isSupported) {
    return (
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        color: '#92400e',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <AlertTriangle size={20} color="#f59e0b" />
        <span>Your browser does not support the HTML5 Web Notifications API. Please open in Google Chrome on Desktop for native push reminders.</span>
      </div>
    );
  }

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '14px',
      border: isGranted ? '2px solid #38bdf8' : '2px dashed #94a3b8',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      color: '#0f172a'
    }}>
      {/* Header & Permission Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: isGranted ? '#e0f2fe' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isGranted ? '#0284c7' : '#64748b'
          }}>
            {isGranted ? <BellRing size={22} color="#0284c7" /> : <BellOff size={22} color="#64748b" />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Chrome Browser Medicine Reminders
              </h4>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: isGranted ? '#dcfce7' : isDenied ? '#fee2e2' : '#fef3c7',
                color: isGranted ? '#15803d' : isDenied ? '#b91c1c' : '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isGranted ? <CheckCircle size={12} /> : isDenied ? <AlertTriangle size={12} /> : <Clock size={12} />}
                {isGranted ? 'Notifications Active' : isDenied ? 'Permission Blocked' : 'Permission Required'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Customize your reminder times. Edge may suppress Windows popups in some desktop sessions, so the app adds a fallback in-page alert when needed.
            </p>
          </div>
        </div>

        {/* Permission Toggle / Status Action */}
        <div>
          {!isGranted ? (
            <button
              id="enable-chrome-reminders-btn"
              type="button"
              onClick={handleRequestPermission}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Bell size={16} /> Enable Chrome Reminders
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              border: '1px solid #bbf7d0'
            }}>
              <ShieldCheck size={16} /> Chrome Push Ready
            </div>
          )}
        </div>
      </div>

      {/* Alert Notice Toast / Feedback Message */}
      {alertMessage && (
        <div style={{
          backgroundColor: isSavedSuccess ? '#f0fdf4' : '#eff6ff',
          border: `1px solid ${isSavedSuccess ? '#86efac' : '#bfdbfe'}`,
          color: isSavedSuccess ? '#166534' : '#1e40af',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          {isSavedSuccess ? <CheckCircle size={16} color="#16a34a" /> : <Sparkles size={16} color="#2563eb" />}
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Interactive Customizable Reminder Time Pickers Form */}
      <form onSubmit={handleSaveReminderPreferences} style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#0284c7" />
            <span>Customize Reminder Alert Times:</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Local preferences automatically persisted in your browser
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          
          {/* MORNING TIME PICKER */}
          <div style={{
            backgroundColor: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                htmlFor="morning-reminder-time-input"
                style={{ fontSize: '12px', fontWeight: '800', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Sun size={15} color="#eab308" /> Morning Dose
              </label>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#a16207',
                backgroundColor: '#fef9c3',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid #fde047'
              }}>
                {formatTime12Hour(customTimes.morning)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#713f12', marginBottom: '8px' }}>
              Default: 08:00 AM
            </div>
            <input
              id="morning-reminder-time-input"
              type="time"
              value={customTimes.morning}
              onChange={(e) => handleTimeChange('morning', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #fde047',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '600',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {/* AFTERNOON TIME PICKER */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                htmlFor="afternoon-reminder-time-input"
                style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Sunset size={15} color="#0284c7" /> Afternoon Dose
              </label>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#0284c7',
                backgroundColor: '#e0f2fe',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid #7dd3fc'
              }}>
                {formatTime12Hour(customTimes.afternoon)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#075985', marginBottom: '8px' }}>
              Default: 01:00 PM
            </div>
            <input
              id="afternoon-reminder-time-input"
              type="time"
              value={customTimes.afternoon}
              onChange={(e) => handleTimeChange('afternoon', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #7dd3fc',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '600',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {/* NIGHT TIME PICKER */}
          <div style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                htmlFor="night-reminder-time-input"
                style={{ fontSize: '12px', fontWeight: '800', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Moon size={15} color="#9333ea" /> Night Dose
              </label>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#7e22ce',
                backgroundColor: '#f3e8ff',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid #d8b4fe'
              }}>
                {formatTime12Hour(customTimes.night)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#581c87', marginBottom: '8px' }}>
              Default: 08:00 PM
            </div>
            <input
              id="night-reminder-time-input"
              type="time"
              value={customTimes.night}
              onChange={(e) => handleTimeChange('night', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #d8b4fe',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '600',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Action Buttons: Save Preferences & Reset */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button
            id="reset-reminder-times-btn"
            type="button"
            onClick={handleResetDefaults}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease'
            }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
          
          <button
            id="save-reminder-preferences-btn"
            type="submit"
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Save size={15} /> Save Reminder Preferences
          </button>
        </div>
      </form>

      {/* Quick Test Pill Buttons for Morning, Afternoon, and Night */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        padding: '12px 14px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="#0284c7" />
          <span>Active Alerts: <strong>Morning ({formatTime12Hour(customTimes.morning)})</strong> • <strong>Afternoon ({formatTime12Hour(customTimes.afternoon)})</strong> • <strong>Night ({formatTime12Hour(customTimes.night)})</strong></span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            id="test-morning-reminder-btn"
            type="button"
            onClick={() => handleTestNotification('Morning')}
            style={{
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ☀️ Test Morning
          </button>
          <button
            id="test-afternoon-reminder-btn"
            type="button"
            onClick={() => handleTestNotification('Afternoon')}
            style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ⛅ Test Afternoon
          </button>
          <button
            id="test-night-reminder-btn"
            type="button"
            onClick={() => handleTestNotification('Night')}
            style={{
              backgroundColor: '#f3e8ff',
              color: '#6b21a8',
              border: '1px solid #e9d5ff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🌙 Test Night
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChromeMedicineReminderCard;

