/**
 * Phase 2 auth checks against a running API.
 * Prints pass/fail only. Does not print tokens, passwords, or secrets.
 *
 * Optional env for existing accounts (values are never printed):
 * TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD
 * TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD
 * TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
require('dotenv').config();

const jwt = require('jsonwebtoken');

const API = process.env.API_BASE || 'http://localhost:5000';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function skip(name, detail) {
  results.push({ name, ok: null, detail });
  console.log(`NOT TESTED  ${name} — ${detail}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  let body = null;
  const text = await response.text();

  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      body = { message: 'Non-JSON response' };
    }
  }

  return { status: response.status, body };
}

async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

async function main() {
  const health = await request('/');
  record(
    'Backend health',
    health.status === 200,
    `HTTP ${health.status}`
  );

  const stamp = Date.now();
  const email = `phase2.${stamp}@campusconnect.example`;
  const password = `Phase2Test-${stamp}-Aa`;
  const name = 'Phase2 Student';

  const registered = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role: 'student' })
  });
  record(
    'Public student registration',
    registered.status === 201 && registered.body?.user?.role === 'student',
    `HTTP ${registered.status}`
  );

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  record(
    'Duplicate email rejected',
    duplicate.status === 409,
    `HTTP ${duplicate.status}`
  );

  const teacherReg = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Blocked Teacher',
      email: `phase2.teacher.${stamp}@campusconnect.example`,
      password,
      role: 'teacher'
    })
  });
  record(
    'Public teacher registration blocked',
    teacherReg.status === 403,
    `HTTP ${teacherReg.status}`
  );

  const adminReg = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Blocked Admin',
      email: `phase2.admin.${stamp}@campusconnect.example`,
      password,
      role: 'admin'
    })
  });
  record(
    'Public admin registration blocked',
    adminReg.status === 403,
    `HTTP ${adminReg.status}`
  );

  const badLogin = await login(email, 'wrong-password');
  record(
    'Invalid credentials rejected',
    badLogin.status === 401 && badLogin.body?.message === 'Invalid email or password',
    `HTTP ${badLogin.status}`
  );

  const goodLogin = await login(email, password);
  const studentToken = goodLogin.body?.token;
  record(
    'New student login',
    goodLogin.status === 200 &&
      goodLogin.body?.user?.role === 'student' &&
      typeof studentToken === 'string' &&
      studentToken.length > 20,
    `HTTP ${goodLogin.status}`
  );

  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${studentToken || ''}` }
  });
  record(
    'Current user profile',
    me.status === 200 && me.body?.user?.email === email && me.body?.user?.role === 'student',
    `HTTP ${me.status}`
  );

  const missing = await request('/api/auth/me');
  record(
    'Protected route without token',
    missing.status === 401,
    `HTTP ${missing.status}`
  );

  const teacherArea = await request('/api/auth/teacher-area', {
    headers: { Authorization: `Bearer ${studentToken || ''}` }
  });
  record(
    'Student token rejected from teacher route',
    teacherArea.status === 403,
    `HTTP ${teacherArea.status}`
  );

  const adminArea = await request('/api/auth/admin-area', {
    headers: { Authorization: `Bearer ${studentToken || ''}` }
  });
  record(
    'Student token rejected from admin route',
    adminArea.status === 403,
    `HTTP ${adminArea.status}`
  );

  const studentArea = await request('/api/auth/student-area', {
    headers: { Authorization: `Bearer ${studentToken || ''}` }
  });
  record(
    'Student token accepted on student route',
    studentArea.status === 200,
    `HTTP ${studentArea.status}`
  );

  if (!process.env.JWT_SECRET) {
    skip('Expired token rejected', 'JWT_SECRET is not set in this process');
  } else {
    const expired = jwt.sign(
      { userId: '000000000000000000000000' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: -10 }
    );
    const expiredResponse = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${expired}` }
    });
    record(
      'Expired token rejected',
      expiredResponse.status === 401,
      `HTTP ${expiredResponse.status}`
    );
  }

  const garbage = await request('/api/auth/me', {
    headers: { Authorization: 'Bearer not-a-token' }
  });
  record(
    'Malformed token rejected',
    garbage.status === 401,
    `HTTP ${garbage.status}`
  );

  await checkExisting('Student', process.env.TEST_STUDENT_EMAIL, process.env.TEST_STUDENT_PASSWORD, 'student');
  await checkExisting('Teacher', process.env.TEST_TEACHER_EMAIL, process.env.TEST_TEACHER_PASSWORD, 'teacher');
  await checkExisting('Admin', process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD, 'admin');

  const failed = results.filter(item => item.ok === false).length;
  const skipped = results.filter(item => item.ok === null).length;
  console.log(`Summary: ${results.length - failed - skipped} passed, ${failed} failed, ${skipped} not tested`);
  console.log(`Registration test account created: ${email}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function checkExisting(label, email, password, role) {
  if (!email || !password) {
    skip(`${label} login with existing account`, 'credentials were not provided to this test');
    return;
  }

  const response = await login(email, password);
  const token = response.body?.token;
  const roleOk = response.body?.user?.role === role;
  record(
    `${label} login with existing account`,
    response.status === 200 && roleOk && typeof token === 'string',
    `HTTP ${response.status}`
  );

  if (response.status !== 200 || !token) {
    return;
  }

  const area = role === 'student'
    ? '/api/auth/student-area'
    : role === 'teacher'
      ? '/api/auth/teacher-area'
      : '/api/auth/admin-area';

  const allowed = await request(area, {
    headers: { Authorization: `Bearer ${token}` }
  });
  record(
    `${label} can open own role route`,
    allowed.status === 200,
    `HTTP ${allowed.status}`
  );
}

main().catch(error => {
  console.error('Phase 2 verification stopped:', error.message);
  process.exitCode = 1;
});
