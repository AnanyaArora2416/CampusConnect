const { fail } = require('../lib/utils');
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) fail(401, 'Authentication required');
    if (!roles.includes(req.user.role)) fail(403, 'Access denied: insufficient permissions');
    next();
  };
module.exports = { authorize };
