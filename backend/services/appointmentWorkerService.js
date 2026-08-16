import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  processScheduleValidation,
  processBillingCalculation,
  processBatchNotifications
} from '../workers/appointmentWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, '../workers/appointmentWorker.js');

/**
 * Execute a task inside a dedicated Worker Thread with automatic fallback to main thread.
 */
export const runWorkerTask = (type, payload) => {
  return new Promise((resolve) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let worker;

    try {
      worker = new Worker(workerPath);

      const timeout = setTimeout(() => {
        if (worker) {
          worker.terminate().catch(() => {});
        }
        // Fallback to synchronous execution
        console.warn(`[WorkerThreads] Task ${type} timed out in worker. Running in main thread fallback.`);
        resolve(runDirectFallback(type, payload));
      }, 3500);

      worker.on('message', (response) => {
        clearTimeout(timeout);
        worker.terminate().catch(() => {});
        if (response && response.success) {
          resolve(response.data);
        } else {
          console.warn(`[WorkerThreads] Worker returned error: ${response?.error}. Running fallback.`);
          resolve(runDirectFallback(type, payload));
        }
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        worker.terminate().catch(() => {});
        console.warn(`[WorkerThreads] Worker error (${err.message}). Running main thread fallback.`);
        resolve(runDirectFallback(type, payload));
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          // If already resolved, this is a no-op
          resolve(runDirectFallback(type, payload));
        }
      });

      // Send payload to worker thread
      worker.postMessage({ type, payload, taskId });
    } catch (err) {
      console.warn(`[WorkerThreads] Could not spawn worker (${err.message}). Using main thread fallback.`);
      resolve(runDirectFallback(type, payload));
    }
  });
};

/**
 * Direct fallback runner (runs directly in main thread when Worker threads cannot be spawned)
 */
export const runDirectFallback = (type, payload) => {
  try {
    switch (type) {
      case 'VALIDATE_AND_SCHEDULE':
        return processScheduleValidation(payload);
      case 'CALCULATE_BILLING':
        return processBillingCalculation(payload);
      case 'PROCESS_BATCH_NOTIFICATIONS':
        return processBatchNotifications(payload);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  } catch (err) {
    console.error(`[WorkerFallback] Error during fallback execution:`, err);
    return { valid: true, error: err.message };
  }
};

/**
 * High-level helper methods for controllers
 */
export const validateAppointmentSchedule = (data) => {
  return runWorkerTask('VALIDATE_AND_SCHEDULE', data);
};

export const calculateBillingBreakdown = (data) => {
  return runWorkerTask('CALCULATE_BILLING', data);
};

export const generateBatchNotifications = (data) => {
  return runWorkerTask('PROCESS_BATCH_NOTIFICATIONS', data);
};
