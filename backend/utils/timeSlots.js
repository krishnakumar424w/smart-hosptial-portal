/**
 * 10-Minute Granular Time Slot Utilities for Doctor Appointment Booking
 * Standard sessions:
 *  - Morning: 09:00 AM to 12:00 PM (18 slots of 10 mins each)
 *  - Afternoon: 02:00 PM to 05:00 PM (18 slots of 10 mins each)
 *  - Evening: 05:30 PM to 07:30 PM (12 slots of 10 mins each)
 */

export const generate10MinSlots = (startHour, startMin, endHour, endMin) => {
  const slots = [];
  let cur = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (cur < end) {
    const next = cur + 10;

    const formatTime = (mins, withPeriod = true) => {
      let h = Math.floor(mins / 60);
      const m = mins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      const hStr = h < 10 ? `0${h}` : `${h}`;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return withPeriod ? `${hStr}:${mStr} ${ampm}` : `${hStr}:${mStr}`;
    };

    const startPeriod = Math.floor(cur / 60) >= 12 ? 'PM' : 'AM';
    const endPeriod = Math.floor(next / 60) >= 12 ? 'PM' : 'AM';

    // Format: "10:00 - 10:10 AM" if same period, or "11:50 AM - 12:00 PM" if period transition
    let slotLabel = '';
    if (startPeriod === endPeriod) {
      slotLabel = `${formatTime(cur, false)} - ${formatTime(next, true)}`;
    } else {
      slotLabel = `${formatTime(cur, true)} - ${formatTime(next, true)}`;
    }

    slots.push(slotLabel);
    cur = next;
  }
  return slots;
};

export const MORNING_SLOTS = generate10MinSlots(9, 0, 12, 0); // 09:00 AM - 12:00 PM (18 slots)
export const AFTERNOON_SLOTS = generate10MinSlots(14, 0, 17, 0); // 02:00 PM - 05:00 PM (18 slots)
export const EVENING_SLOTS = generate10MinSlots(17, 30, 19, 30); // 05:30 PM - 07:30 PM (12 slots)

export const ALL_10MIN_SLOTS = [
  ...MORNING_SLOTS,
  ...AFTERNOON_SLOTS,
  ...EVENING_SLOTS
];

/**
 * Normalize slot string for accurate conflict detection
 */
export const normalizeSlot = (slot) => {
  if (!slot) return '';
  return String(slot).trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Check if two slot representations conflict
 */
export const isSlotConflict = (slotA, slotB) => {
  const normA = normalizeSlot(slotA);
  const normB = normalizeSlot(slotB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Handle prefix matching (e.g. legacy "10:00 AM" vs "10:00 - 10:10 AM")
  const startA = normA.split('-')[0].trim();
  const startB = normB.split('-')[0].trim();
  if (startA && startB && startA === startB) return true;

  return false;
};

export default {
  MORNING_SLOTS,
  AFTERNOON_SLOTS,
  EVENING_SLOTS,
  ALL_10MIN_SLOTS,
  generate10MinSlots,
  normalizeSlot,
  isSlotConflict
};
