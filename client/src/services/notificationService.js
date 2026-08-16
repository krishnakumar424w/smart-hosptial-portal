/**
 * Web Push Notification Service for Patient Daily Medicine Reminders
 * Supports standard Chrome Web Notification APIs, permission handling, scheduled intervals,
 * and audio chime alerts on notification delivery.
 */

// Key for tracking dispatched reminder slots for today
const STORAGE_KEY_SENT = 'smart_hospital_sent_reminders_';
export const STORAGE_KEY_CUSTOM_TIMES = 'medicine_reminder_times';
export const STORAGE_KEY_REMINDER_STATE = 'smart_hospital_reminder_state_v1';
export const REMINDER_REPEAT_INTERVAL_MS = 7 * 60 * 1000;
export const DEFAULT_REMINDER_TIMES = {
  morning: '08:00',
  afternoon: '13:00',
  night: '20:00'
};

const normalizeReminderSlotKey = (slot) => {
  const value = String(slot || '').toLowerCase();
  if (value.includes('morning')) return 'morning';
  if (value.includes('afternoon') || value.includes('evening')) return 'afternoon';
  if (value.includes('night')) return 'night';
  return value;
};

const getReminderDateKey = (date = new Date()) => date.toISOString().split('T')[0];

const readReminderState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMINDER_STATE);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Unable to read reminder state from localStorage:', e);
    return {};
  }
};

const writeReminderState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY_REMINDER_STATE, JSON.stringify(state));
  } catch (e) {
    console.warn('Unable to save reminder state to localStorage:', e);
  }
};

export const getReminderStateForToday = () => {
  const todayKey = getReminderDateKey();
  const state = readReminderState();
  return state[todayKey] || {};
};

export const setReminderSlotState = (slot, updater) => {
  const key = normalizeReminderSlotKey(slot);
  const todayKey = getReminderDateKey();
  const state = readReminderState();
  const todayState = state[todayKey] || {};
  const current = todayState[key] || { acknowledged: false, lastSentAt: 0 };
  const nextValue = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  todayState[key] = nextValue;
  state[todayKey] = todayState;
  writeReminderState(state);
  return nextValue;
};

export const acknowledgeReminderSlot = (slot) => {
  return setReminderSlotState(slot, (current) => ({
    ...current,
    acknowledged: true,
    acknowledgedAt: Date.now(),
    lastSentAt: current.lastSentAt || Date.now()
  }));
};

export const isReminderSlotAcknowledged = (slot) => {
  const todayState = getReminderStateForToday();
  const key = normalizeReminderSlotKey(slot);
  return !!todayState[key]?.acknowledged;
};

export const getStoredReminderTimes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TIMES) || localStorage.getItem('smart_hospital_med_times');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        morning: parsed.morning || DEFAULT_REMINDER_TIMES.morning,
        afternoon: parsed.afternoon || parsed.evening || DEFAULT_REMINDER_TIMES.afternoon,
        night: parsed.night || DEFAULT_REMINDER_TIMES.night
      };
    }
  } catch (e) {
    console.debug('Error reading reminder times from localStorage:', e);
  }
  return { ...DEFAULT_REMINDER_TIMES };
};

export const saveStoredReminderTimes = (times) => {
  const payload = {
    morning: times.morning || DEFAULT_REMINDER_TIMES.morning,
    afternoon: times.afternoon || DEFAULT_REMINDER_TIMES.afternoon,
    night: times.night || DEFAULT_REMINDER_TIMES.night
  };
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TIMES, JSON.stringify(payload));
    localStorage.setItem('smart_hospital_med_times', JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save reminder times to localStorage:', e);
  }
  return payload;
};

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Web Notifications are not supported in this browser environment.');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
};

export const showInAppReminderToast = ({
  title = 'Medicine Reminder',
  body = 'Time to take your medicine.',
  onClickCallback = null,
  onAcknowledge = null,
  slot = 'Morning'
} = {}) => {
  if (typeof document === 'undefined') return null;

  const toastId = `medicine-toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const wrapper = document.createElement('div');
  wrapper.id = toastId;
  wrapper.style.position = 'fixed';
  wrapper.style.right = '18px';
  wrapper.style.bottom = '18px';
  wrapper.style.zIndex = '99999';
  wrapper.style.maxWidth = '360px';
  wrapper.style.width = 'min(360px, calc(100vw - 24px))';
  wrapper.style.background = 'rgba(15, 23, 42, 0.96)';
  wrapper.style.color = '#fff';
  wrapper.style.borderRadius = '14px';
  wrapper.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.28)';
  wrapper.style.padding = '14px 16px';
  wrapper.style.border = '1px solid rgba(148, 163, 184, 0.35)';
  wrapper.style.fontFamily = 'Inter, Arial, sans-serif';
  wrapper.style.cursor = 'pointer';
  wrapper.style.pointerEvents = 'auto';

  const inner = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="width:32px;height:32px;border-radius:10px;background:#0ea5e9;display:flex;align-items:center;justify-content:center;font-size:18px;">💊</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.2px;">${title}</div>
        <div style="font-size:12px;line-height:1.5;color:#e2e8f0;margin-top:5px;">${body}</div>
        <button type="button" data-action="ack" style="margin-top:10px;background:#22c55e;border:none;color:white;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:800;cursor:pointer;">OK</button>
      </div>
      <button type="button" data-action="dismiss" aria-label="Dismiss reminder toast" style="border:none;background:transparent;color:#cbd5e1;font-size:18px;cursor:pointer;padding:0 2px;">×</button>
    </div>
  `;

  wrapper.innerHTML = inner;

  const dismiss = () => {
    wrapper.remove();
  };

  wrapper.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action="ack"]');
    const dismissButton = event.target.closest('[data-action="dismiss"]');

    if (actionButton) {
      dismiss();
      if (typeof onAcknowledge === 'function') {
        onAcknowledge(slot);
      }
      return;
    }

    if (dismissButton) {
      dismiss();
      return;
    }

    if (typeof onClickCallback === 'function') {
      onClickCallback(slot);
    }
    dismiss();
  });

  document.body.appendChild(wrapper);
  setTimeout(dismiss, 15000);

  return wrapper;
};

/**
 * Play a gentle hospital chime using Web Audio API when notification fires
 */
export const playReminderChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    // Two-tone bell chime: E5 (659Hz) -> A5 (880Hz)
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(659.25, now, 0.4);
    playTone(880.0, now + 0.15, 0.6);
  } catch (e) {
    console.debug('Audio chime skipped:', e.message);
  }
};

/**
 * Trigger a native Chrome Desktop Web Notification
 */
export const sendMedicineNotification = ({
  timeSlot = 'Morning', // 'Morning', 'Afternoon', 'Night' / 'Evening'
  medicines = [],
  onClickCallback = null,
  onAcknowledge = null
}) => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted. Current state:', Notification.permission);
    return null;
  }

  const formattedSlot = timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  const title = `💊 Hospital Medicine Reminder — ${formattedSlot}`;

  let bodyText = '';
  if (medicines.length > 0) {
    const medDetails = medicines
      .map((m) => `${m.name || 'Medicine'} (${m.dosage || '1 dose'})`)
      .join(', ');
    bodyText = `Time to take your prescribed medicine: ${medDetails}.`;
  } else {
    bodyText = `Time to take your scheduled ${formattedSlot.toLowerCase()} prescribed medicine.`;
  }

  const iconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%230284c7"><rect width="100" height="100" rx="24" fill="%230284c7"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="white" stroke-width="16" stroke-linecap="round"/><circle cx="50" cy="50" r="12" fill="%2338bdf8"/></svg>`;

  try {
    const notification = new Notification(title, {
      body: bodyText,
      icon: iconSvg,
      badge: iconSvg,
      tag: `med-reminder-${timeSlot.toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      renotify: true,
      requireInteraction: true
    });

    playReminderChime();

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();

      if (typeof onClickCallback === 'function') {
        onClickCallback(formattedSlot);
      } else {
        const scheduleSection = document.getElementById('medicine-schedule-section');
        if (scheduleSection) {
          scheduleSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.href = '/patient-dashboard#medicine-schedule-section';
        }
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error('Error creating Notification instance:', err);
    playReminderChime();

    try {
      showInAppReminderToast({
        title: `💊 ${title}`,
        body: bodyText,
        slot: formattedSlot,
        onAcknowledge,
        onClickCallback: () => {
          if (typeof onClickCallback === 'function') {
            onClickCallback(formattedSlot);
            return;
          }

          const scheduleSection = document.getElementById('medicine-schedule-section');
          if (scheduleSection) {
            scheduleSection.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.location.href = '/patient-dashboard#medicine-schedule-section';
          }
        }
      });
    } catch (toastErr) {
      console.error('Fallback reminder toast failed:', toastErr);
    }

    return null;
  }
};

/**
 * Check and fire daily schedule notifications
 * Default schedule times:
 *  - Morning: 08:00 AM (Hour 8)
 *  - Afternoon: 01:00 PM (Hour 13)
 *  - Night: 08:00 PM (Hour 20)
 *
 * Notifications repeat every 7 minutes until the patient marks the reminder as OK
 * for that slot, and the acknowledgment is stored in localStorage so it survives a page refresh.
 */
export const checkAndTriggerScheduledReminders = ({
  schedule = { morning: [], evening: [], night: [] },
  customTimes = null,
  onClickCallback = null,
  onAcknowledge = null
}) => {
  if (getNotificationPermission() !== 'granted') return;

  const activeTimes = customTimes || getStoredReminderTimes();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDateStr = now.toISOString().split('T')[0];
  const slotConfigs = [
    {
      key: 'morning',
      display: 'Morning',
      medicines: Array.isArray(schedule.morning) ? schedule.morning : [],
      time: activeTimes.morning || DEFAULT_REMINDER_TIMES.morning
    },
    {
      key: 'afternoon',
      display: 'Afternoon',
      medicines: Array.isArray(schedule.evening) ? schedule.evening : [],
      time: activeTimes.afternoon || DEFAULT_REMINDER_TIMES.afternoon
    },
    {
      key: 'night',
      display: 'Night',
      medicines: Array.isArray(schedule.night) ? schedule.night : [],
      time: activeTimes.night || DEFAULT_REMINDER_TIMES.night
    }
  ];

  slotConfigs.forEach((slotConfig) => {
    const state = getReminderStateForToday()[slotConfig.key] || { acknowledged: false, lastSentAt: 0 };
    if (state.acknowledged) return;

    const [hour, minute] = slotConfig.time.split(':').map(Number);
    const slotMinutes = hour * 60 + minute;
    const lastSentAt = Number(state.lastSentAt || 0);
    const dueAtTime = new Date(`${todayDateStr}T${slotConfig.time}:00`).getTime();
    const nextRepeatAt = lastSentAt > 0 ? lastSentAt + REMINDER_REPEAT_INTERVAL_MS : dueAtTime;

    const shouldSend =
      slotConfig.medicines.length > 0 &&
      currentMinutes >= slotMinutes &&
      (
        (lastSentAt === 0 && now.getTime() >= dueAtTime && now.getTime() <= dueAtTime + 5 * 60 * 1000) ||
        (lastSentAt > 0 && now.getTime() >= nextRepeatAt)
      );

    if (!shouldSend) return;

    const handleAck = (slotName) => {
      acknowledgeReminderSlot(slotName);
      if (typeof onAcknowledge === 'function') {
        onAcknowledge(slotName);
      }
    };

    sendMedicineNotification({
      timeSlot: slotConfig.display,
      medicines: slotConfig.medicines,
      onClickCallback,
      onAcknowledge: handleAck
    });

    setReminderSlotState(slotConfig.key, {
      acknowledged: false,
      lastSentAt: Date.now()
    });
  });
};

export default {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendMedicineNotification,
  checkAndTriggerScheduledReminders,
  playReminderChime,
  showInAppReminderToast,
  getStoredReminderTimes,
  saveStoredReminderTimes,
  getReminderStateForToday,
  setReminderSlotState,
  acknowledgeReminderSlot,
  isReminderSlotAcknowledged,
  DEFAULT_REMINDER_TIMES,
  STORAGE_KEY_CUSTOM_TIMES,
  STORAGE_KEY_REMINDER_STATE,
  REMINDER_REPEAT_INTERVAL_MS
};
