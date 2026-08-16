import { useState, useEffect } from 'react';
import { createPrescription, searchMedicines } from '../services/api';
import { X, Plus, Trash2, Search, FileText, Send, CheckCircle2, Globe } from 'lucide-react';
import GoogleMedicineSearchModal from './GoogleMedicineSearchModal';

const PrescriptionSheetModal = ({ isOpen, onClose, appointment, onPrescriptionCreated }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleSearchModalOpen, setGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');

  // Rows state for 4-column medicine table
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '1 tablet',
      duration: '5 days',
      timing: { morning: true, afternoon: false, night: true },
      tablets: 10,
      showSuggestions: false,
      suggestions: []
    }
  ]);

  if (!isOpen || !appointment) return null;

  const patientName = appointment.patientId?.name || appointment.patient?.name || 'Patient';
  const patientAge = appointment.patientId?.age || appointment.patient?.age || 'N/A';
  const patientGender = appointment.patientId?.gender || appointment.patient?.gender || 'N/A';
  const doctorName = appointment.doctor?.name || 'Dr. Medical Specialist';

  const handleAddRow = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        dosage: '1 tablet',
        duration: '5 days',
        timing: { morning: true, afternoon: false, night: true },
        tablets: 10,
        showSuggestions: false,
        suggestions: []
      }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const handleMedicineNameChange = async (index, value) => {
    const updated = [...medicines];
    updated[index].name = value;

    if (value.trim().length > 0) {
      try {
        const { data } = await searchMedicines(value);
        updated[index].suggestions = Array.isArray(data) ? data : [];
        updated[index].showSuggestions = true;
      } catch (err) {
        console.error('Failed to search medicines:', err);
      }
    } else {
      updated[index].suggestions = [];
      updated[index].showSuggestions = false;
    }

    setMedicines(updated);
  };

  const selectSuggestion = (index, sug) => {
    // sug can be object or string
    const isObj = typeof sug === 'object' && sug !== null;
    if (isObj && sug.isOutOfStock) {
      // Prevent selecting out of stock medicine or show warning
      alert(`"${sug.name}" is currently OUT OF STOCK in the hospital inventory. Please select an alternate medicine or contact the pharmacy.`);
      return;
    }

    const medName = isObj ? sug.name : sug;
    const updated = [...medicines];
    updated[index].name = medName;
    if (isObj && sug.dosage) {
      updated[index].dosage = sug.dosage;
    }
    if (isObj && sug.pricePerUnit) {
      updated[index].pricePerUnit = sug.pricePerUnit;
    }
    updated[index].showSuggestions = false;
    setMedicines(updated);
  };

  const handleTimingChange = (index, timeKey) => {
    const updated = [...medicines];
    updated[index].timing[timeKey] = !updated[index].timing[timeKey];
    setMedicines(updated);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setError('Please provide a clinical diagnosis');
      return;
    }

    const validMedicines = medicines.filter((m) => m.name.trim().length > 0);
    if (validMedicines.length === 0) {
      setError('Please enter at least one medicine name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        appointmentId: appointment._id,
        patientId: appointment.patientId?._id || appointment.patientId,
        patientName,
        diagnosis,
        notes,
        medicines: validMedicines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          duration: m.duration || 'As advised',
          timing: m.timing,
          tablets: Number(m.tablets) || 1,
          instructions: notes || 'Take as advised'
        }))
      };

      await createPrescription(payload);
      if (onPrescriptionCreated) onPrescriptionCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #cbd5e1',
        textAlign: 'left'
      }}>
        {/* Header Action Bar */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '14px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '700', fontSize: '16px' }}>
            <FileText size={20} /> Medical Prescription Sheet
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Prescription Paper Sheet (A4 Style Page) */}
        <div style={{ padding: '32px', backgroundColor: '#ffffff' }}>
          {/* Hospital Header & Doctor Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0284c7',
            paddingBottom: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                SMART HOSPITAL MEDICAL CENTER
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                123 Health Boulevard, Multi-Specialty Department | Helpline: +1 (800) 555-0199
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>
                {doctorName}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                Cardiology & General Medicine
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Patient Details Row */}
          <div style={{
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Patient Name:</span>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{patientName}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Age / Gender:</span>
              <div style={{ fontWeight: '600', color: '#334155' }}>{patientAge} yrs / {patientGender}</div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Appointment Time:</span>
              <div style={{ fontWeight: '600', color: '#334155' }}>{appointment.timeSlot || '10:00 AM'}</div>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Clinical Diagnosis Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Clinical Diagnosis / Findings *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mild Hypertension, Viral Fever, Routine Follow-up"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Medicine Table Header with Add Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.3px' }}>
                Prescribed Medicines Rx
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                title="Add Medicine Row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Add Medicine
              </button>
            </div>

            {/* 4-Column Medicine Table */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', width: '28%' }}>1. Medicine Name (Search)</th>
                    <th style={{ padding: '10px 12px', width: '18%' }}>2. Dosage</th>
                    <th style={{ padding: '10px 12px', width: '18%' }}>3. Duration</th>
                    <th style={{ padding: '10px 12px', width: '22%' }}>4. Timing (M - A - N)</th>
                    <th style={{ padding: '10px 12px', width: '10%' }}>5. Tablets</th>
                    <th style={{ padding: '10px 8px', width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((row, index) => (
                    <tr key={index} style={{ borderBottom: index < medicines.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      {/* Column 1: Medicine Name with Search Engine Autocomplete & Google Search Trigger */}
                      <td style={{ padding: '8px 12px', position: 'relative' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Type medicine name..."
                              value={row.name}
                              onChange={(e) => handleMedicineNameChange(index, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          {/* In-app Google Search trigger button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGoogleSearchQuery(row.name || 'Paracetamol');
                              setGoogleSearchModalOpen(true);
                            }}
                            title="Search medicine indications, uses & side effects via Google"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '6px',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#2563eb',
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dbeafe';
                              e.currentTarget.style.borderColor = '#93c5fd';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                              e.currentTarget.style.borderColor = '#bfdbfe';
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                          </button>

                          {row.showSuggestions && row.suggestions.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              minWidth: '320px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              boxShadow: '0 12px 24px -4px rgba(0,0,0,0.15)',
                              zIndex: 150,
                              maxHeight: '220px',
                              overflowY: 'auto',
                              marginTop: '4px'
                            }}>
                              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>SUGGESTED HOSPITAL MEDICINES</span>
                                <span>STOCK STATUS</span>
                              </div>
                              {row.suggestions.map((sug, i) => {
                                const isObj = typeof sug === 'object' && sug !== null;
                                const medName = isObj ? sug.name : sug;
                                const category = isObj ? sug.category : 'General';
                                const quantity = isObj ? (sug.quantity ?? 0) : 50;
                                const isOutOfStock = isObj ? sug.isOutOfStock : quantity <= 0;
                                const isLowStock = isObj ? sug.isLowStock : (quantity > 0 && quantity <= 20);
                                const count = isObj ? (sug.prescriptionCount || 0) : 0;

                                return (
                                  <div
                                    key={i}
                                    onClick={() => selectSuggestion(index, sug)}
                                    style={{
                                      padding: '8px 12px',
                                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                      borderBottom: i < row.suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                      fontSize: '12px',
                                      backgroundColor: isOutOfStock ? '#fef2f2' : '#ffffff',
                                      opacity: isOutOfStock ? 0.75 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isOutOfStock) e.currentTarget.style.backgroundColor = '#f0f9ff';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isOutOfStock) e.currentTarget.style.backgroundColor = '#ffffff';
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: '700', color: isOutOfStock ? '#991b1b' : '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>💊</span>
                                        <span>{medName}</span>
                                        {count > 0 && (
                                          <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>
                                            ⭐ {count}x
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        {category} • {isObj?.unit || 'Tablets'}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isOutOfStock ? (
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          backgroundColor: '#fee2e2',
                                          color: '#dc2626',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Out of Stock (0)
                                        </span>
                                      ) : isLowStock ? (
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          backgroundColor: '#fef3c7',
                                          color: '#d97706',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Low: {quantity} left
                                        </span>
                                      ) : (
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          backgroundColor: '#dcfce7',
                                          color: '#16a34a',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Stock: {quantity}
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setGoogleSearchQuery(medName);
                                          setGoogleSearchModalOpen(true);
                                        }}
                                        title={`Google search details for ${medName}`}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: '3px',
                                          cursor: 'pointer',
                                          color: '#2563eb',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <Search size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Dosage */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          placeholder="e.g. 500mg, 1 tablet"
                          value={row.dosage}
                          onChange={(e) => handleFieldChange(index, 'dosage', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Column 3: Duration */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          placeholder="e.g. 5 days"
                          value={row.duration}
                          onChange={(e) => handleFieldChange(index, 'duration', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Column 4: Timing Checkboxes (Morning, Afternoon, Night) */}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={row.timing.morning}
                              onChange={() => handleTimingChange(index, 'morning')}
                            /> Morn
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={row.timing.afternoon}
                              onChange={() => handleTimingChange(index, 'afternoon')}
                            /> Aft
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={row.timing.night}
                              onChange={() => handleTimingChange(index, 'night')}
                            /> Night
                          </label>
                        </div>
                      </td>

                      {/* Column 5: Number of Tablets */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="1"
                          value={row.tablets}
                          onChange={(e) => handleFieldChange(index, 'tablets', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Row Delete Button */}
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          disabled={medicines.length === 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: medicines.length === 1 ? '#cbd5e1' : '#ef4444',
                            cursor: medicines.length === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Special Instructions & Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Dietary & Lifestyle Advice / Special Instructions
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Drink plenty of warm water, take rest, avoid oily food..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)'
                }}
              >
                <Send size={16} /> {loading ? 'Sending...' : 'Issue Prescription (WebSocket Live)'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* In-app Google Medicine Search Modal */}
      <GoogleMedicineSearchModal
        isOpen={googleSearchModalOpen}
        onClose={() => setGoogleSearchModalOpen(false)}
        initialQuery={googleSearchQuery}
      />
    </div>
  );
};

export default PrescriptionSheetModal;
