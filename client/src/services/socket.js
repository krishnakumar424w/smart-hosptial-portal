import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or initialize the singleton Socket.IO connection
 */
export const getSocket = () => {
  if (!socket) {
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const isLegacyVercelHost = currentOrigin.includes('smart-hosptial-portal.vercel.app');

    const socketUrl = envSocketUrl || (isLegacyVercelHost ? 'https://smart-hosptial-portal-m3tr.vercel.app' : currentOrigin || 'https://smart-hosptial-portal-m3tr.vercel.app');

    socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket] Connected to server, ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket] Connection error:', error.message);
    });
  }
  return socket;
};

/**
 * Initialize socket and join user role rooms
 */
export const initSocket = (user) => {
  const s = getSocket();

  if (s.connected && user) {
    registerUserRooms(s, user);
  } else {
    s.once('connect', () => {
      if (user) {
        registerUserRooms(s, user);
      }
    });
  }

  return s;
};

const registerUserRooms = (s, user) => {
  if (!user || !user._id) return;

  if (user.role === 'patient') {
    s.emit('join_patient', user._id);
    console.log(`[Socket] Joined room: patient_${user._id}`);
  } else if (user.role === 'doctor') {
    s.emit('join_doctor', user._id);
    console.log(`[Socket] Joined room: doctor_${user._id}`);
  } else if (user.role === 'admin') {
    s.emit('join_admin');
    console.log('[Socket] Joined admin_room');
  }
};

/**
 * Subscribe to real-time appointment events with clean unsubscribe teardown
 */
export const subscribeToAppointments = ({
  onCreated,
  onUpdated,
  onStatusChanged,
  onAvailabilityUpdated,
  onSlotBooked,
  onPrescriptionCreated
}) => {
  const s = getSocket();

  const handleCreated = (data) => {
    if (onCreated && typeof onCreated === 'function') {
      onCreated(data);
    }
  };

  const handleUpdated = (data) => {
    if (onUpdated && typeof onUpdated === 'function') {
      onUpdated(data);
    }
  };

  const handleStatusChanged = (data) => {
    if (onStatusChanged && typeof onStatusChanged === 'function') {
      onStatusChanged(data);
    }
  };

  const handleAvailabilityUpdated = (data) => {
    if (onAvailabilityUpdated && typeof onAvailabilityUpdated === 'function') {
      onAvailabilityUpdated(data);
    }
  };

  const handleSlotBooked = (data) => {
    if (onSlotBooked && typeof onSlotBooked === 'function') {
      onSlotBooked(data);
    }
  };

  const handlePrescription = (data) => {
    if (onPrescriptionCreated && typeof onPrescriptionCreated === 'function') {
      onPrescriptionCreated(data);
    }
  };

  // Register listeners
  if (onCreated) s.on('appointment:created', handleCreated);
  if (onUpdated) s.on('appointment:updated', handleUpdated);
  if (onStatusChanged) s.on('appointment:status_changed', handleStatusChanged);
  if (onAvailabilityUpdated) s.on('doctor:availability_updated', handleAvailabilityUpdated);
  if (onSlotBooked) {
    s.on('slot:booked', handleSlotBooked);
    s.on('slot:locked', handleSlotBooked);
  }
  if (onPrescriptionCreated) {
    s.on('prescription_created', handlePrescription);
    s.on('new_prescription', handlePrescription);
  }

  // Return unsubscribe cleanup function
  return () => {
    if (onCreated) s.off('appointment:created', handleCreated);
    if (onUpdated) s.off('appointment:updated', handleUpdated);
    if (onStatusChanged) s.off('appointment:status_changed', handleStatusChanged);
    if (onAvailabilityUpdated) s.off('doctor:availability_updated', handleAvailabilityUpdated);
    if (onSlotBooked) {
      s.off('slot:booked', handleSlotBooked);
      s.off('slot:locked', handleSlotBooked);
    }
    if (onPrescriptionCreated) {
      s.off('prescription_created', handlePrescription);
      s.off('new_prescription', handlePrescription);
    }
  };
};

/**
 * Emit client-side appointment created event
 */
export const emitAppointmentCreated = (appointment) => {
  const s = getSocket();
  if (s) {
    s.emit('appointment:create', appointment);
  }
};

/**
 * Emit client-side slot booked / locked event
 */
export const emitSlotBooked = (slotData) => {
  const s = getSocket();
  if (s) {
    s.emit('slot:book', slotData);
  }
};

/**
 * Emit client-side appointment status update
 */
export const emitAppointmentStatusUpdate = (appointment) => {
  const s = getSocket();
  if (s) {
    s.emit('appointment:status_update', { appointment });
  }
};

/**
 * Disconnect socket cleanly
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  getSocket,
  initSocket,
  subscribeToAppointments,
  emitAppointmentCreated,
  emitSlotBooked,
  emitAppointmentStatusUpdate,
  disconnectSocket
};
