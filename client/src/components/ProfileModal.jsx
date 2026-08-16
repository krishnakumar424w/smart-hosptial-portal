import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { updateUserProfile } from '../services/api';
import UserAvatar from './UserAvatar';
import { User, X, Camera, Save, CheckCircle, Award, Heart, Phone, Mail, Calendar, MapPin, Briefcase, Upload, Trash2 } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, login } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: user?.gender || 'Male',
    dob: user?.dob || '',
    bloodGroup: user?.bloodGroup || 'O+',
    address: user?.address || '',
    photo: user?.photo || '',
    specialization: user?.specialization || 'General Medicine',
    degree: user?.degree || user?.qualification || 'MBBS',
    experience: user?.experience || '5 years'
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (!isOpen || !user) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size exceeds 2MB limit. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newPhoto = reader.result;
        setFormData((prev) => ({ ...prev, photo: newPhoto }));
        const updatedUser = { ...user, photo: newPhoto };
        login(updatedUser, localStorage.getItem('token'));
        setSuccessMsg('Profile photo updated successfully!');

        try {
          const { data } = await updateUserProfile({ ...formData, photo: newPhoto });
          if (data) login(data, localStorage.getItem('token'));
        } catch (err) {
          console.log('Backend sync note:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    setFormData((prev) => ({ ...prev, photo: '' }));
    const updatedUser = { ...user, photo: '' };
    login(updatedUser, localStorage.getItem('token'));
    setSuccessMsg('Reverted to clean default WhatsApp avatar.');
    try {
      await updateUserProfile({ ...formData, photo: '' });
    } catch (err) {
      console.log('Backend sync note:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      const { data } = await updateUserProfile(formData);
      login(data, localStorage.getItem('token'));
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        color: '#1e293b',
        textAlign: 'left'
      }}>
        {/* Header Banner */}
        <div style={{
          background: user.role === 'doctor' 
            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
            : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          padding: '24px',
          color: '#ffffff',
          position: 'relative',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <input
                type="file"
                id="avatar-file-input"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <UserAvatar
                src={formData.photo || user?.photo}
                role={user?.role}
                size={80}
                name={user?.name}
                onClick={() => document.getElementById('avatar-file-input')?.click()}
                style={{
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              />
              <label
                htmlFor="avatar-file-input"
                title="Upload Your Profile Photo"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid #ffffff',
                  fontSize: '15px',
                  fontWeight: '900',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.25)'
                }}
              >
                +
              </label>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#ffffff' }}>
                {user.name}
              </h2>
              <span style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 10px',
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {user.role === 'doctor' ? `Doctor (${user.specialization || 'General'})` : user.role === 'patient' ? 'Patient' : 'Administrator'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              border: '1px solid #bbf7d0'
            }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {!isEditing ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={13} /> Email
                  </div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>{user.email}</div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} /> Phone
                  </div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>{user.phone || 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Age / DOB
                  </div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>
                    {user.age ? `${user.age} yrs` : 'N/A'} {user.dob ? `(${user.dob})` : ''}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={13} /> Blood Group
                  </div>
                  <div style={{ fontWeight: '600', marginTop: '4px', color: '#dc2626' }}>{user.bloodGroup || 'O+'}</div>
                </div>

                {user.role === 'patient' && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> Address
                    </div>
                    <div style={{ fontWeight: '600', marginTop: '4px' }}>{user.address || 'Not provided'}</div>
                  </div>
                )}

                {user.role === 'doctor' && (
                  <>
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={13} /> Speciality
                      </div>
                      <div style={{ fontWeight: '600', marginTop: '4px', color: '#0284c7' }}>{user.specialization || 'General Medicine'}</div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={13} /> Degree
                      </div>
                      <div style={{ fontWeight: '600', marginTop: '4px' }}>{user.degree || user.qualification || 'MBBS'}</div>
                    </div>

                    <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Briefcase size={13} /> Experience
                      </div>
                      <div style={{ fontWeight: '600', marginTop: '4px' }}>{user.experience || '8 years experience'}</div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Profile Picture</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-file-input')?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={14} /> Upload New Picture
                    </button>
                    {formData.photo && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Use Default Avatar
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="url"
                      name="photo"
                      value={formData.photo}
                      onChange={handleChange}
                      placeholder="Or enter custom image URL (https://...)"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Date of Birth (DOB)</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {user.role === 'patient' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street, City, State, ZIP"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {user.role === 'doctor' && (
                  <>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Speciality Field</label>
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="e.g. Cardiology, General Medicine"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Degree / Qualification</label>
                      <input
                        type="text"
                        name="degree"
                        value={formData.degree}
                        onChange={handleChange}
                        placeholder="e.g. MBBS, MD"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Experience</label>
                      <input
                        type="text"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        placeholder="e.g. 10 years"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
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
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={15} /> {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
