const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { run, fail } = require('../lib/utils');
const protect = run(async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) fail(401, 'Authentication required');
  let decoded;
  try {
    decoded = jwt.verify(match[1], req.app.locals.config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'campusconnect',
      audience: 'campusconnect-web',
    });
  } catch {
    fail(401, 'Invalid or expired session');
  }
  if (!/^[a-f\d]{24}$/i.test(decoded.userId || '')) fail(401, 'Invalid session');
  const user = await User.findById(decoded.userId).select('+tokenVersion');
  if (!user || user.status !== 'active' || (user.tokenVersion || 0) !== decoded.version)
    fail(401, 'Session is no longer valid');
  req.user = user;
  next();
});
module.exports = { protect };
