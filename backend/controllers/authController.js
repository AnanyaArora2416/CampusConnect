const bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'),
  User = require('../models/User'),
  v = require('../lib/utils');
async function registerUser(req, res) {
  const b = v.body(req.body, ['name', 'email', 'password', 'role']);
  if (b.role !== undefined && b.role !== 'student')
    v.fail(
      403,
      'Only student registration is public. Contact an administrator for teacher access.',
    );
  const name = v.text(b.name, 'Name', 100, 2),
    email = v.email(b.email),
    password = v.password(b.password);
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'student',
  });
  res
    .status(201)
    .json({ message: 'Account created. You can now sign in.', user: v.safeUser(user) });
}
async function loginUser(req, res) {
  const b = v.body(req.body, ['email', 'password']),
    email = v.email(b.email);
  v.password(b.password);
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  const hash = user?.password || '$2b$12$xFjX3WiQNbjKH8QKxUEQ8Od8B.KW0dSIZgaVOD/urH/3Y8nD4RxVS';
  const matches = await bcrypt.compare(b.password, hash);
  if (!user || !matches || user.status !== 'active') v.fail(401, 'Invalid email or password');
  const token = jwt.sign(
    { userId: String(user._id), version: user.tokenVersion || 0 },
    req.app.locals.config.jwtSecret,
    { expiresIn: '1h', algorithm: 'HS256', issuer: 'campusconnect', audience: 'campusconnect-web' },
  );
  res.json({ token, user: v.safeUser(user) });
}
module.exports = { registerUser, loginUser };
