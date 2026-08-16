import { parentPort, workerData, isMainThread } from 'worker_threads';
import { ALL_10MIN_SLOTS, isSlotConflict } from '../utils/timeSlots.js';

/**
 * Pure logic implementation for appointment scheduling, billing calculation,
 * and batch notification generation.
 * This runs in worker threads to offload heavy calculations from the main event loop.
 */

export const processScheduleValidation = (data) => {
  const { doctorId, date, timeSlot, existingAppointments = [], doctorData = {} } = data;
  
  // Format target date string (YYYY-MM-DD)
  const targetDateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
  
  // Find conflicts using exact/normalized 10-minute slot matching
  const conflicts = existingAppointments.filter((app) => {
    if (app.status === 'Cancelled') return false;
    
    const appDoctorId = typeof app.doctorId === 'object' ? app.doctorId?._id : app.doctorId;
    if (String(appDoctorId) !== String(doctorId)) return false;
    
    const appDateStr = typeof app.date === 'string' ? app.date.split('T')[0] : new Date(app.date).toISOString().split('T')[0];
    if (appDateStr !== targetDateStr) return false;
    
    const appSlot = app.timeSlot || app.time;
    return isSlotConflict(appSlot, timeSlot);
  });

  const isConflict = conflicts.length > 0;
  
  // Calculate existing patient load on this date
  const doctorLoadOnDate = existingAppointments.filter((app) => {
    if (app.status === 'Cancelled') return false;
    const appDoctorId = typeof app.doctorId === 'object' ? app.doctorId?._id : app.doctorId;
    const appDateStr = typeof app.date === 'string' ? app.date.split('T')[0] : new Date(app.date).toISOString().split('T')[0];
    return String(appDoctorId) === String(doctorId) && appDateStr === targetDateStr;
  }).length;

  // Compute estimated queue token and wait time (10 mins per granular slot)
  const queueNumber = doctorLoadOnDate + 1;
  const estimatedWaitMinutes = doctorLoadOnDate * 10;

  // 10-minute granular slots
  const allStandardSlots = ALL_10MIN_SLOTS;
  const bookedSlotsOnDate = existingAppointments
    .filter((app) => {
      if (app.status === 'Cancelled') return false;
      const appDoctorId = typeof app.doctorId === 'object' ? app.doctorId?._id : app.doctorId;
      const appDateStr = typeof app.date === 'string' ? app.date.split('T')[0] : new Date(app.date).toISOString().split('T')[0];
      return String(appDoctorId) === String(doctorId) && appDateStr === targetDateStr;
    })
    .map((app) => app.timeSlot || app.time);

  const remainingAvailableSlots = allStandardSlots.filter((slot) => {
    return !bookedSlotsOnDate.some((b) => isSlotConflict(b, slot));
  });

  return {
    valid: !isConflict,
    isConflict,
    queueNumber,
    estimatedWaitMinutes,
    bookedSlotsOnDate,
    remainingAvailableSlots,
    concurrencyToken: `SCHED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    processedAt: new Date().toISOString()
  };
};

export const processBillingCalculation = (data) => {
  const { doctorFee = 150, isEmergency = false, items = [] } = data;
  
  const baseConsultation = Number(doctorFee) || 150;
  const hospitalRegistrationFee = 50;
  const emergencySurcharge = isEmergency ? 100 : 0;
  
  let pharmacyTotal = 0;
  const processedItems = items.map((item) => {
    const qty = Number(item.quantity || item.tablets) || 1;
    const unitPrice = Number(item.pricePerUnit) || 10;
    const itemTotal = Number(item.totalCost) || (qty * unitPrice);
    pharmacyTotal += itemTotal;
    return {
      name: item.name || 'Medicine',
      quantity: qty,
      unitPrice,
      totalCost: itemTotal
    };
  });

  const subTotal = baseConsultation + hospitalRegistrationFee + emergencySurcharge + pharmacyTotal;
  const gstTax = Math.round(subTotal * 0.05 * 100) / 100; // 5% hospital GST
  const grandTotal = Math.round((subTotal + gstTax) * 100) / 100;

  return {
    baseConsultation,
    hospitalRegistrationFee,
    emergencySurcharge,
    pharmacyTotal,
    subTotal,
    gstTax,
    grandTotal,
    items: processedItems,
    calculatedAt: new Date().toISOString()
  };
};

export const processBatchNotifications = (data) => {
  const { appointment, doctor, patient } = data;
  
  const appDate = appointment?.date ? new Date(appointment.date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Scheduled Date';
  const appTime = appointment?.timeSlot || '10:00 AM';
  
  // Format notifications for patient, doctor, and hospital admin
  const patientNotification = {
    recipientId: patient?._id || appointment?.patientId,
    recipientRole: 'patient',
    channel: 'SMS_AND_INAPP',
    title: 'Consultation Confirmed',
    message: `Your appointment with Dr. ${doctor?.name || 'Doctor'} is confirmed for ${appDate} at ${appTime}.`,
    timestamp: new Date().toISOString()
  };

  const doctorNotification = {
    recipientId: doctor?._id || appointment?.doctorId,
    recipientRole: 'doctor',
    channel: 'INAPP_ALERT',
    title: 'New Patient Booking',
    message: `Patient ${patient?.name || 'Patient'} booked a consultation on ${appDate} at ${appTime}. Symptoms: ${appointment?.symptoms || 'None'}`,
    timestamp: new Date().toISOString()
  };

  const adminAuditLog = {
    action: 'APPOINTMENT_SCHEDULED',
    appointmentId: appointment?._id,
    patientName: patient?.name,
    doctorName: doctor?.name,
    amount: appointment?.amount || 150,
    timestamp: new Date().toISOString()
  };

  return {
    success: true,
    notifications: [patientNotification, doctorNotification],
    adminAuditLog,
    batchId: `BATCH-${Date.now()}`
  };
};

// If running inside Worker Thread, listen for messages
if (!isMainThread && parentPort) {
  parentPort.on('message', (message) => {
    try {
      const { type, payload, taskId } = message;
      let result;

      switch (type) {
        case 'VALIDATE_AND_SCHEDULE':
          result = processScheduleValidation(payload);
          break;
        case 'CALCULATE_BILLING':
          result = processBillingCalculation(payload);
          break;
        case 'PROCESS_BATCH_NOTIFICATIONS':
          result = processBatchNotifications(payload);
          break;
        default:
          throw new Error(`Unknown worker task type: ${type}`);
      }

      parentPort.postMessage({ success: true, taskId, data: result });
    } catch (err) {
      parentPort.postMessage({ success: false, taskId: message?.taskId, error: err.message });
    }
  });
}
