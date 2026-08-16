import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import UserAvatar from './UserAvatar';
import { LogOut, Activity } from 'lucide-react';

const TopHeader = ({ title }) => {
  const { user, logout } = useContext(AuthContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left Side: Profile Icon & User Greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            id="topheader-profile-btn"
            onClick={() => setIsProfileOpen(true)}
            title="Click to view & edit Profile"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              outline: 'none'
            }}
          >
            <UserAvatar
              user={user}
              size={42}
              showBadge={true}
              style={{
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                {user?.role === 'doctor' ? `Dr. Profile (${user.specialization || 'General'})` : user?.role === 'patient' ? 'Patient Profile' : 'Admin Profile'}
              </div>
            </div>
          </button>
        </div>

        {/* Center: System Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
              Smart Hospital
            </h1>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              {title || 'Management System'}
            </span>
          </div>
        </div>

        {/* Right Side: Logout Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Top Left Corner Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

export default TopHeader;
