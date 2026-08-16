import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import { memoryStore } from '../config/memoryStore.js';

// In-memory Mock Bank Registry for UPI Transactions & Duplicate Prevention
const verifiedBankRegistry = new Map(); // transactionId -> { invoiceId, amount, paidAt, upiId, verified: true }
const expectedIntentRegistry = new Map(); // invoiceId -> { expectedTransactionId, amount, createdAt }

// Seed some sample processed transactions to ensure duplicate detection works out-of-the-box
verifiedBankRegistry.set('400000000001', {
  invoiceId: 'SAMPLE-INV-001',
  amount: 550,
  paidAt: new Date(Date.now() - 86400000).toISOString(),
  upiId: 'krishna4u.rn@oksbi',
  verified: true
});
verifiedBankRegistry.set('429184029180', {
  invoiceId: 'SAMPLE-INV-002',
  amount: 150,
  paidAt: new Date(Date.now() - 43200000).toISOString(),
  upiId: 'krishna4u.rn@oksbi',
  verified: true
});

/**
 * Validates a 12-digit UPI UTR / Transaction Reference number against NPCI & banking format rules
 * @param {string} txnId 
 * @returns {{ isValid: boolean, error?: string }}
 */
const validateUtrFormat = (txnId) => {
  if (!txnId || typeof txnId !== 'string') {
    return {
      isValid: false,
      error: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
    };
  }

  const cleanTxn = txnId.trim();

  // 1. Strict 12 numerical digits regex
  const twelveDigitRegex = /^\d{12}$/;
  if (!twelveDigitRegex.test(cleanTxn)) {
    return {
      isValid: false,
      error: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
    };
  }

  // 2. Reject obvious fake repetitive strings (e.g. 000000000000, 111111111111, ..., 999999999999)
  const isAllSameDigits = /^(\d)\1{11}$/.test(cleanTxn);
  if (isAllSameDigits) {
    return {
      isValid: false,
      error: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
    };
  }

  // 3. Reject sequential dummy numbers (e.g. 123456789012, 012345678901, 987654321098)
  const ascending = '0123456789012345';
  const descending = '9876543210987654';
  if (ascending.includes(cleanTxn) || descending.includes(cleanTxn)) {
    return {
      isValid: false,
      error: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
    };
  }

  return { isValid: true, cleanTxn };
};

/**
 * @desc Generate payment intent & expected Transaction Reference for an invoice/appointment
 * @route POST /api/payments/create-intent
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const { invoiceId, appointmentId, amount } = req.body;
    const targetId = invoiceId || appointmentId || ('BILL_' + Date.now());
    
    // Generate valid 12-digit mock bank UTR starting with 4 (Standard NPCI prefix)
    const expectedTxnId = '4' + Math.floor(10000000000 + Math.random() * 90000000000);
    
    expectedIntentRegistry.set(String(targetId), {
      expectedTransactionId: expectedTxnId,
      amount: amount || 550,
      createdAt: new Date()
    });

    return res.json({
      success: true,
      invoiceId: targetId,
      expectedTransactionId: expectedTxnId,
      vpa: 'krishna4u.rn@oksbi',
      amount: amount || 550
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Verify UPI Payment with 12-Digit UTR and Update Invoice / Appointment Status
 * @route POST /api/payments/verify-upi
 */
export const verifyUpiPayment = async (req, res) => {
  try {
    const { invoiceId, appointmentId, transactionId, amount, upiId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
      });
    }

    const cleanTxn = String(transactionId).trim();

    // Step 1: Strict 12 numerical digits and anti-fraud validation
    const formatCheck = validateUtrFormat(cleanTxn);
    if (!formatCheck.isValid) {
      return res.status(400).json({
        message: formatCheck.error || 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
      });
    }

    // Step 2: Check for duplicate UTR number in mock bank registry
    if (verifiedBankRegistry.has(cleanTxn)) {
      const existingTxn = verifiedBankRegistry.get(cleanTxn);
      const targetId = invoiceId || appointmentId;
      // If already used for a different invoice, or already processed
      if (String(existingTxn.invoiceId) !== String(targetId)) {
        return res.status(400).json({
          message: 'Invalid or unverified Transaction Reference / UTR Number. Please check your payment app receipt.'
        });
      }
    }

    const targetInvoiceId = invoiceId || appointmentId;
    const finalAmount = Number(amount) || 550;
    const merchantUpi = upiId || 'krishna4u.rn@oksbi';
    const paidAt = new Date();

    let updatedItem = null;
    let itemType = 'invoice';

    // Step 3: Update database (Mongoose or MemoryStore)
    if (global.isMongoConnected) {
      // 1. Try to find prescription by ID
      if (targetInvoiceId) {
        try {
          const pres = await Prescription.findById(targetInvoiceId);
          if (pres) {
            pres.paymentStatus = 'Paid';
            pres.paymentDetails = {
              upiId: merchantUpi,
              transactionId: cleanTxn,
              amount: finalAmount || pres.bill?.totalAmount || 550,
              paidAt
            };
            await pres.save();
            updatedItem = pres;
            itemType = 'prescription';

            // Also settle linked appointment if present
            if (pres.appointmentId) {
              await Appointment.findByIdAndUpdate(pres.appointmentId, {
                paymentStatus: 'Paid',
                paymentDetails: {
                  upiId: merchantUpi,
                  transactionId: cleanTxn,
                  amount: finalAmount,
                  paidAt
                }
              });
            }
          }
        } catch (e) {
          // Continue to appointment check if not valid ObjectId for prescription
        }

        // 2. If not prescription, check appointment
        if (!updatedItem) {
          try {
            const app = await Appointment.findById(targetInvoiceId);
            if (app) {
              app.paymentStatus = 'Paid';
              if (app.status === 'Pending') app.status = 'Confirmed';
              app.paymentDetails = {
                upiId: merchantUpi,
                transactionId: cleanTxn,
                amount: finalAmount || app.amount || 150,
                paidAt
              };
              await app.save();
              updatedItem = app;
              itemType = 'appointment';
            }
          } catch (e) {}
        }
      }
    } else {
      // In-Memory store update
      if (targetInvoiceId) {
        // Try prescription update
        const pres = memoryStore.updatePrescriptionPayment(targetInvoiceId, {
          upiId: merchantUpi,
          transactionId: cleanTxn,
          amount: finalAmount
        });

        if (pres) {
          updatedItem = pres;
          itemType = 'prescription';
        } else {
          // Try appointment update
          const app = memoryStore.updateAppointmentPayment(targetInvoiceId, {
            upiId: merchantUpi,
            transactionId: cleanTxn,
            amount: finalAmount
          });
          if (app) {
            updatedItem = app;
            itemType = 'appointment';
          }
        }
      }
    }

    // Step 4: Register transaction as settled in mock bank registry
    verifiedBankRegistry.set(cleanTxn, {
      invoiceId: targetInvoiceId,
      amount: finalAmount,
      paidAt: paidAt.toISOString(),
      upiId: merchantUpi,
      verified: true
    });

    // Step 5: Real-time WebSocket event broadcast
    if (global.io) {
      try {
        global.io.emit('payment:verified', {
          invoiceId: targetInvoiceId,
          transactionId: cleanTxn,
          amount: finalAmount,
          status: 'Paid',
          timestamp: paidAt.toISOString()
        });

        if (updatedItem && itemType === 'appointment') {
          global.io.emit('appointment:updated', updatedItem);
        }
      } catch (wsErr) {
        console.error('WebSocket emit error on payment verification:', wsErr);
      }
    }

    // Step 6: Return 200 OK success receipt confirmation
    return res.status(200).json({
      success: true,
      message: 'UPI Payment verified and invoice settled successfully',
      receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
      invoiceId: targetInvoiceId,
      transactionId: cleanTxn,
      amount: finalAmount,
      paymentDetails: {
        upiId: merchantUpi,
        transactionId: cleanTxn,
        amount: finalAmount,
        paidAt: paidAt.toISOString(),
        status: 'Paid',
        settlementChannel: 'NPCI_UPI_MOCK_GATEWAY'
      },
      item: updatedItem
    });
  } catch (error) {
    console.error('Error during UPI payment verification:', error);
    return res.status(500).json({
      message: 'An internal server error occurred while verifying the payment. Please try again.'
    });
  }
};
