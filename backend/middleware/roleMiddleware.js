export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user?.role || 'Guest'}) is not authorized to access this route` 
      });
    }
    next();
  };
};

export const authorize = authorizeRoles;
