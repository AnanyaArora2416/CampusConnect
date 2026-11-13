
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// REGISTER USER
// Public registration creates students only.
// Teacher/admin accounts require approval
// or a separate protected provisioning flow.
// ==========================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    // 1. Validate required fields
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 2. Validate name and email
    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: 'Please enter a valid name and email'
      });
    }

    // 3. Validate password
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: 'Password must be 8 to 128 characters'
      });
    }

    // 4. Prevent public teacher/admin registration
    if (role !== undefined && role !== 'student') {
      return res.status(403).json({
        message:
          'Only student registration is currently available. ' +
          'Teacher accounts must be approved by an administrator.'
      });
    }

    // 5. Check for existing email
    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 7. Save new student
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'student'
    });

    // 8. Return response without password
    return res.status(201).json({
      message: 'Student registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      message: 'Server error during registration'
    });
  }
};

// ==========================================
// LOGIN USER
// Works for student, teacher and admin.
// ==========================================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // 1. Validate input
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // 2. Find user
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+password');

    // 3. Validate credentials
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // 4. Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        message: 'Authentication is temporarily unavailable'
      });
    }

    // 5. Generate token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    // 6. Return login response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};

module.exports = {
  registerUser,
  loginUser
};
