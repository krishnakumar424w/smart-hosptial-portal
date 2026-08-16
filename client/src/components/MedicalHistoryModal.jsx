import { useState } from 'react';
import UserAvatar from './UserAvatar';
import GoogleMedicineSearchModal from './GoogleMedicineSearchModal';
import { 
  X, 
  Heart, 
  Activity, 
  ShieldAlert, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Droplet,
  CheckCircle,
  Plus,
  Trash2,
  Clock,
  Search
} from 'lucide-react';

const MedicalHistoryModal = ({ isOpen, onClose, user, prescriptions = [], appointments = [] }) => {
  const [allergies, setAllergies] = useState(['Penicillin (Mild rash)', 'Peanuts (Mild allergy)']);
  const [newAllergy, setNewAllergy] = useState('');
  const [chronicConditions, setChronicConditions] = useState(['Hypertension (Stage 1)']);
  const [newCondition, setNewCondition] = useState('');
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'prescriptions' | 'vitals'
  const [googleSearchModalOpen, setGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');

  if (!isOpen || !user) return null;

  const handleAddAllergy = (e) => {
    e.preventDefault();
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (idx) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  const handleAddCondition = (e) => {
    e.preventDefault();
    if (newCondition.trim() && !chronicConditions.includes(newCondition.trim())) {
      setChronicConditions([...chronicConditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemoveCondition = (idx) => {
    setChronicConditions(chronicConditions.filter((_, i) => i !== idx));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1250,
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
        maxWidth: '720px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #cbd5e1',
        textAlign: 'left'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '22px 24px',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '12px' }}>
              <Heart size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                Patient Medical History
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                Official EHR Health Profile & Clinical Assessment Records
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          padding: '8px 24px 0 24px',
          gap: '12px'
        }}>
          {[
            { id: 'history', label: 'Clinical Timeline', icon: Activity },
            { id: 'vitals', label: 'Vitals & Allergies', icon: Droplet },
            { id: 'prescriptions', label: 'Prescription Records', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: active ? '3px solid #0284c7' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  color: active ? '#0284c7' : '#64748b',
                  fontWeight: active ? '800' : '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '24px' }}>
          {/* Patient Quick Vitals Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <UserAvatar
              src={user.photo}
              role="patient"
              name={user.name}
              size={48}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              flex: 1
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>PATIENT NAME</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{user.name || 'Patient'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>AGE & GENDER</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {user.age || '32'} yrs / {user.gender || 'Male'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>BLOOD GROUP</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>
                  🩸 {user.bloodGroup || 'O+'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>PHONE</span>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                  {user.phone || '555-0199'}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: CLINICAL TIMELINE */}
          {activeTab === 'history' && (
            <div>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#0284c7" /> Medical Consultation Timeline
              </h4>

              {prescriptions.length === 0 && appointments.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  No past consultation logs available.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {prescriptions.map((pres, idx) => {
                    const docName = pres.doctor?.name || pres.doctorId?.name || 'Dr. Specialty Consultant';
                    const docSpec = pres.doctor?.specialization || pres.doctorId?.specialization || 'Internal Medicine';
                    const dateStr = pres.createdAt ? new Date(pres.createdAt).toLocaleDateString() : 'Recent';

                    return (
                      <div
                        key={pres._id || idx}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
                              CONSULTATION RECORD
                            </span>
                            <h5 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                              {docName} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>({docSpec})</span>
                            </h5>
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                            📅 {dateStr}
                          </span>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            <strong style={{ color: '#0f172a' }}>Diagnosed Condition:</strong> {pres.diagnosis || 'Clinical checkup'}
                          </div>
                          {pres.notes && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                              <strong style={{ color: '#0f172a' }}>Doctor Advice:</strong> {pres.notes}
                            </div>
                          )}
                        </div>

                        {Array.isArray(pres.medicines) && pres.medicines.length > 0 && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PRESCRIBED MEDICINES:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {pres.medicines.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  style={{
                                    backgroundColor: '#e0f2fe',
                                    color: '#0369a1',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  💊 {m.name} ({m.dosage || '1 tab'})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VITALS & ALLERGIES */}
          {activeTab === 'vitals' && (
            <div>
              {/* Allergies section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} /> Known Drug & Food Allergies
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {allergies.map((all, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ⚠️ {all}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddAllergy} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add known allergy (e.g. Sulfa drugs, Latex)..."
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: '#b91c1c', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </form>
              </div>

              {/* Chronic conditions section */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={16} /> Chronic Medical Conditions
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {chronicConditions.map((cond, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#e0f2fe',
                        border: '1px solid #bae6fd',
                        color: '#0369a1',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🩺 {cond}
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddCondition} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add chronic condition (e.g. Asthma, Diabetes)..."
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: PRESCRIPTION ARCHIVE */}
          {activeTab === 'prescriptions' && (
            <div>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#0284c7" /> Official Prescription Records
              </h4>
              {prescriptions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  No prescriptions stored in the digital record.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {prescriptions.map((p, idx) => (
                    <div
                      key={p._id || idx}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                          {p.doctor?.name || p.doctorId?.name || 'Dr. Specialist'}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600', marginBottom: '8px' }}>
                        Diagnosis: {p.diagnosis || 'Clinical Diagnosis'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: '700', marginBottom: '6px' }}>Prescribed Medicines:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(p.medicines || []).map((m, mIdx) => (
                            <span
                              key={mIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: '#1e293b'
                              }}
                            >
                              <span>💊 {m.name} ({m.dosage || '1 tablet'})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setGoogleSearchQuery(m.name);
                                  setGoogleSearchModalOpen(true);
                                }}
                                title={`Google search details for ${m.name}`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '1px'
                                }}
                              >
                                <Search size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Close Medical History
          </button>
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

export default MedicalHistoryModal;
