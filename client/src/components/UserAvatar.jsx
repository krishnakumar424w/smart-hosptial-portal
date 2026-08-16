import { useState, useEffect } from 'react';
import { Stethoscope, ShieldCheck, UserCheck } from 'lucide-react';

/**
 * WhatsApp-Style Default Profile Avatar
 * Supports custom uploaded pictures with automatic fallback to WhatsApp-style clean vector silhouette.
 * Role-based clean color accents for Patients, Doctors, and Admins.
 */
const UserAvatar = ({
  src,
  user,
  role,
  name,
  size = 40,
  className = '',
  style = {},
  showBadge = false,
  onClick,
  alt
}) => {
  const [imageError, setImageError] = useState(false);

  const effectiveRole = (role || user?.role || 'patient').toLowerCase();
  const effectivePhoto = src !== undefined ? src : user?.photo;
  const effectiveName = name || user?.name || 'User';

  // Convert size presets to px if string is passed
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
    '3xl': 96
  };

  const pixelSize = typeof size === 'number' ? size : (sizeMap[size] || 40);

  // Reset image error state if photo changes
  useEffect(() => {
    setImageError(false);
  }, [effectivePhoto]);

  // Role Color Accents & Themes
  const getTheme = () => {
    switch (effectiveRole) {
      case 'doctor':
        return {
          bg: '#e0f2fe',       // Soft sky 100
          silhouette: '#0284c7',// Sky 600
          border: '#bae6fd',   // Sky 200
          badgeBg: '#0284c7',
          badgeIcon: Stethoscope
        };
      case 'admin':
        return {
          bg: '#f1f5f9',       // Slate 100
          silhouette: '#475569',// Slate 600
          border: '#cbd5e1',   // Slate 300
          badgeBg: '#6b21a8',
          badgeIcon: ShieldCheck
        };
      case 'patient':
      default:
        return {
          bg: '#e2e8f0',       // Slate 200 (classic WhatsApp tone)
          silhouette: '#64748b',// Slate 500
          border: '#cbd5e1',   // Slate 300
          badgeBg: '#16a34a',
          badgeIcon: UserCheck
        };
    }
  };

  const theme = getTheme();
  const hasCustomPhoto = Boolean(effectivePhoto && !imageError);

  const BadgeIcon = theme.badgeIcon;
  const badgeSize = Math.max(12, Math.round(pixelSize * 0.32));

  return (
    <div
      className={`user-avatar-container ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        flexShrink: 0,
        display: 'inline-flex',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      title={alt || effectiveName}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: hasCustomPhoto ? '#f1f5f9' : theme.bg,
          border: `1.5px solid ${theme.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        {hasCustomPhoto ? (
          <img
            src={effectivePhoto}
            alt={alt || effectiveName}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          /* WhatsApp-Style Default Silhouette Vector */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              color: theme.silhouette,
              overflow: 'hidden'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: '82%',
                height: '82%',
                marginBottom: '-2px',
                fill: 'currentColor'
              }}
            >
              {/* Head */}
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              {/* Upper Torso / Shoulders with smooth WhatsApp curve */}
              <path d="M12 14c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Optional Role Badge */}
      {showBadge && (
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            borderRadius: '50%',
            backgroundColor: theme.badgeBg,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          <BadgeIcon size={Math.round(badgeSize * 0.65)} />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
