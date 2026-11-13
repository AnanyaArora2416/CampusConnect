
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader ||
        !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication token required'
      });
    }

    // 2. Extract the token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required'
      });
    }

    // 3. Verify token signature and expiration
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    // 4. Find the user in MongoDB
    const user = await User.findById(decoded.userId)
      .select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists'
      });
    }

    // 5. Attach authenticated user to request
    req.user = user;

    // 6. Allow request to continue
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError' ||
        error.name === 'CastError') {
      return res.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    console.error('Authentication error:', error.message);

    return res.status(500).json({
      message: 'Authentication failed'
    });
  }
};

module.exports = { protect };
