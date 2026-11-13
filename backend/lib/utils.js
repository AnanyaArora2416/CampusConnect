const mongoose = require('mongoose');
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const run = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function body(value, fields) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !fields.includes(k))
  )
    fail(400, 'Supply a JSON object with supported fields');
  return value;
}
function text(value, name, max = 5000, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    fail(400, `${name} must contain ${min} to ${max} characters`);
  return value.trim();
}
function email(value) {
  value = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400, 'Enter a valid email');
  return value;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72)
    fail(400, 'Password needs at least 8 characters and at most 72 UTF-8 bytes');
  return value;
}
function id(value) {
  if (!mongoose.isObjectIdOrHexString(value)) fail(400, 'Invalid record ID');
  return value;
}
function choice(value, name, allowed) {
  if (!allowed.includes(value)) fail(400, `Invalid ${name}`);
  return value;
}
function number(value, name, min, max, integer = false) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(400, `${name} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}`);
  return value;
}
function date(value, name, future = true) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    fail(400, `${name} needs an ISO timestamp with timezone`);
  const [y, m, d] = value.slice(0, 10).split('-').map(Number),
    result = new Date(value);
  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > new Date(Date.UTC(y, m, 0)).getUTCDate() ||
    !Number.isFinite(result.getTime()) ||
    (future && result <= new Date())
  )
    fail(400, `${name} must be a valid ${future ? 'future ' : ''}date`);
  return result;
}
function pagination(query) {
  const page = Number(query.page ?? 1),
    limit = Number(query.limit ?? 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    fail(400, 'Invalid pagination');
  return { page, limit, skip: (page - 1) * limit };
}
function search(value) {
  return typeof value === 'string'
    ? value.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : '';
}
const owner = (user, record) =>
  user.role === 'admin' || String(record.createdBy?._id || record.createdBy) === String(user._id);
const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status || 'active',
});
module.exports = {
  fail,
  run,
  body,
  text,
  email,
  password,
  id,
  choice,
  number,
  date,
  pagination,
  search,
  owner,
  safeUser,
};
