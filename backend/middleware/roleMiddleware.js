
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
  
      // Ensure authentication ran first
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required'
        });
      }
  
      // Check whether the user's role is permitted
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: 'Access denied: insufficient permissions'
        });
      }
  
      // User has the required permission
      next();
    };
  };
  
  module.exports = { authorize };
  