import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useContext(AuthContext);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!isAllowed) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;