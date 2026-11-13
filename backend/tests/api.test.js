// All persistence is a temporary local database. Never load .env or use Atlas.
const { test, before, after } = require('node:test'),
  assert = require('node:assert/strict'),
  request = require('supertest'),
  { MongoMemoryReplSet } = require('mongodb-memory-server'),
  mongoose = require('mongoose'),
  bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { createApp } = require('../app'),
  connectDB = require('../config/db'),
  User = require('../models/User'),
  Assignment = require('../models/Assignment'),
  Submission = require('../models/Submission'),
  Event = require('../models/Event'),
  Registration = require('../models/EventRegistration');
let db,
  app,
  uploadDir,
  student,
  student2,
  teacher,
  teacher2,
  admin,
  assignment,
  draft,
  submission,
  resource,
  event;
const password = 'TestCampus2026!',
  secret = 'local-test-secret-not-production-'.repeat(2),
  future = (n) => new Date(Date.now() + n * 86400000).toISOString(),
  pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const token = (u) =>
    jwt.sign({ userId: String(u._id), version: u.tokenVersion || 0 }, secret, {
      expiresIn: '1h',
      issuer: 'campusconnect',
      audience: 'campusconnect-web',
      algorithm: 'HS256',
    }),
  as = (method, url, user) =>
    request(app)
      [method](url)
      .set('Authorization', `Bearer ${token(user)}`);
before(
  async () => {
    db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campusconnect-api-'));
    app = createApp({ jwtSecret: secret, uploadDir, authLimit: 1000 });
    await connectDB(db.getUri(), 'CampusConnectTest');
    const hash = await bcrypt.hash(password, 4);
    [student, student2, teacher, teacher2, admin] = await User.create(
      ['student', 'student', 'teacher', 'teacher', 'admin'].map((role, i) => ({
        name: `Test ${role} ${i}`,
        email: `test${i}@campus.example`,
        role,
        password: hash,
      })),
    );
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
  if (uploadDir) await fs.rm(uploadDir, { recursive: true, force: true });
});
test('registration validates fields, blocks role escalation and duplicate email', async () => {
  const b = { name: 'Public Student', email: ' Public@Campus.Example ', password };
  await request(app)
    .post('/api/auth/register')
    .send(b)
    .expect(201)
    .expect((r) => {
      assert.equal(r.body.user.role, 'student');
      assert.ok(!r.body.user.password);
    });
  await request(app).post('/api/auth/register').send(b).expect(409);
  for (const role of ['teacher', 'admin', { $ne: 'student' }])
    await request(app)
      .post('/api/auth/register')
      .send({ ...b, email: 'blocked@campus.example', role })
      .expect(403);
  await request(app)
    .post('/api/auth/register')
    .send({ ...b, password: 'é'.repeat(37) })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ ...b, email: 'invalid' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ ...b, status: 'active' })
    .expect(400);
});
test('login, expiry and stored-role gates reject unauthorized access', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: student.email.toUpperCase(), password })
    .expect(200);
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200);
  await request(app)
    .post('/api/auth/login')
    .send({ email: student.email, password: 'WrongPassword2026!' })
    .expect(401);
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk').expect(401);
  const expired = jwt.sign({ userId: String(student._id), version: 0 }, secret, {
    expiresIn: -1,
    issuer: 'campusconnect',
    audience: 'campusconnect-web',
  });
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
  for (const u of [student, teacher, admin])
    for (const role of ['student', 'teacher', 'admin'])
      await as('get', `/api/auth/${role}-area`, u).expect(u.role === role ? 200 : 403);
});
test('assignment CRUD validates fields, ownership, draft visibility and legacy defaults', async () => {
  const b = {
    title: 'Real Coursework',
    subject: 'DBMS',
    description: 'Complete a database design',
    dueDate: future(5),
    maxMarks: 30,
    status: 'published',
    requirements: [{ title: 'ER diagram', description: 'Add cardinality' }],
    resourceNotes: 'Read the notes',
  };
  await as('post', '/api/assignments', student).send(b).expect(403);
  assignment = (await as('post', '/api/assignments', teacher).send(b).expect(201)).body.assignment;
  assert.equal(assignment.status, 'published');
  assert.equal(assignment.requirements.length, 1);
  draft = (
    await as('post', '/api/assignments', teacher)
      .send({ ...b, title: 'Private draft', status: 'draft' })
      .expect(201)
  ).body.assignment;
  await as('get', `/api/assignments/${draft._id}`, student).expect(404);
  await as('get', `/api/assignments/${assignment._id}`, teacher2).expect(404);
  await as('get', `/api/assignments/${assignment._id}`, admin).expect(200);
  await as('get', '/api/assignments?q=Real&limit=1', student)
    .expect(200)
    .expect((r) => assert.equal(r.body.total, 1));
  await as('get', '/api/assignments?limit=-1', student).expect(400);
  await as('get', '/api/assignments/not-an-id', student).expect(400);
  await as('post', '/api/assignments', teacher).expect(400);
  await as('post', '/api/assignments', teacher)
    .send({ ...b, dueDate: '2030-02-30T12:00:00Z' })
    .expect(400);
  await as('put', `/api/assignments/${assignment._id}`, teacher)
    .send({ createdBy: student._id })
    .expect(400);
  await as('put', `/api/assignments/${assignment._id}`, teacher2)
    .send({ title: 'Hijack' })
    .expect(404);
  await as('put', `/api/assignments/${assignment._id}`, teacher)
    .send({ title: 'Updated Real Coursework' })
    .expect(200);
  await Assignment.collection.insertOne({
    title: 'Legacy Coursework',
    subject: 'DBMS',
    description: 'Original schema',
    dueDate: new Date(future(5)),
    status: 'draft',
    createdBy: teacher._id,
  });
  await as('get', '/api/assignments?q=Legacy', teacher)
    .expect(200)
    .expect((r) => {
      assert.equal(r.body.assignments[0].maxMarks, 100);
      assert.deepEqual(r.body.assignments[0].requirements, []);
    });
});
test('private PDF resources validate content and permissions', async () => {
  await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
    .attach('file', Buffer.from('not PDF'), 'spoof.pdf')
    .expect(400);
  await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
    .attach('file', pdf, 'bad.exe')
    .expect(400);
  await as('post', `/api/assignments/${assignment._id}/resources`, student)
    .attach('file', pdf, 'guide.pdf')
    .expect(403);
  resource = (
    await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
      .attach('file', pdf, 'guide.pdf')
      .expect(201)
  ).body.assignment.resources[0];
  assert.ok(!resource.storedName);
  await as('get', `/api/assignments/${assignment._id}/resources/${resource.id}/download`, student)
    .expect(200)
    .expect('Content-Disposition', /attachment/);
  await request(app)
    .get(`/api/assignments/${assignment._id}/resources/${resource.id}/download`)
    .expect(401);
});
test('ZIP and DOCX archives are inspected and resources can be removed', async () => {
  const fixture = require('./fixtures/files.json'),
    before = await fs.readdir(uploadDir);
  await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
    .attach('file', Buffer.from(fixture.zip, 'base64'), 'spoof.docx')
    .expect(400);
  await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
    .attach('file', Buffer.from('PK\x03\x04broken'), 'broken.zip')
    .expect(400);
  assert.deepEqual(await fs.readdir(uploadDir), before);
  for (const ext of ['zip', 'docx']) {
    const r = (
      await as('post', `/api/assignments/${assignment._id}/resources`, teacher)
        .attach('file', Buffer.from(fixture[ext], 'base64'), `notes.${ext}`)
        .expect(201)
    ).body.assignment.resources.at(-1);
    await as(
      'get',
      `/api/assignments/${assignment._id}/resources/${r.id}/download`,
      student,
    ).expect(200);
    await as('delete', `/api/assignments/${assignment._id}/resources/${r.id}`, teacher2).expect(
      404,
    );
    await as('delete', `/api/assignments/${assignment._id}/resources/${r.id}`, teacher).expect(200);
    await as(
      'get',
      `/api/assignments/${assignment._id}/resources/${r.id}/download`,
      student,
    ).expect(404);
  }
});
test('immutable submissions persist receipts and protect file downloads', async () => {
  await as('post', `/api/assignments/${draft._id}/submissions`, student)
    .attach('file', pdf, 'work.pdf')
    .expect(404);
  submission = (
    await as('post', `/api/assignments/${assignment._id}/submissions`, student)
      .attach('file', pdf, 'my-work.pdf')
      .expect(201)
  ).body.submission;
  assert.equal(submission.late, false);
  assert.ok(!submission.file.storedName);
  await as('post', `/api/assignments/${assignment._id}/submissions`, student)
    .attach('file', pdf, 'again.pdf')
    .expect(409);
  await as('get', `/api/submissions/${submission._id}`, student).expect(200);
  await as('get', `/api/submissions/${submission._id}/download`, student2).expect(404);
  await as('get', `/api/submissions/${submission._id}/download`, teacher2).expect(404);
  await as('get', `/api/submissions/${submission._id}/download`, teacher).expect(200);
  await as('get', `/api/assignments/${assignment._id}`, student)
    .expect(200)
    .expect((r) => assert.equal(r.body.submission._id, submission._id));
});
test('oversized uploads fail and temporary files are removed', async () => {
  const before = await fs.readdir(uploadDir);
  await as('post', `/api/assignments/${assignment._id}/submissions`, student2)
    .attach('file', Buffer.alloc(26 * 1024 * 1024, 65), 'huge.pdf')
    .expect(413);
  assert.deepEqual(await fs.readdir(uploadDir), before);
});
test('grading validates bounds, ownership and saved student feedback', async () => {
  await as('put', `/api/submissions/${submission._id}/grade`, student)
    .send({ grade: 20 })
    .expect(403);
  await as('put', `/api/submissions/${submission._id}/grade`, teacher2)
    .send({ grade: 20 })
    .expect(404);
  await as('put', `/api/submissions/${submission._id}/grade`, teacher)
    .send({ grade: 31 })
    .expect(400);
  await as('put', `/api/submissions/${submission._id}/grade`, teacher)
    .send({ grade: 25, feedback: 'Thoughtful work.' })
    .expect(200);
  await as('get', `/api/submissions/${submission._id}`, student)
    .expect(200)
    .expect((r) => assert.equal(r.body.submission.grade, 25));
  await as('put', `/api/assignments/${assignment._id}`, teacher).send({ maxMarks: 20 }).expect(409);
});
test('dashboard metrics reflect actual submitted, overdue and late work', async () => {
  await as('get', '/api/dashboard', student)
    .expect(200)
    .expect((r) => {
      assert.equal(r.body.stats.submitted, 1);
      assert.equal(r.body.stats.completion, 100);
    });
  await Assignment.updateOne(
    { _id: assignment._id },
    { $set: { dueDate: new Date(Date.now() - 1000) } },
  );
  await as('get', '/api/dashboard', student2)
    .expect(200)
    .expect((r) => assert.equal(r.body.stats.overdue, 1));
  await as('post', `/api/assignments/${assignment._id}/submissions`, student2)
    .attach('file', pdf, 'late.pdf')
    .expect(201)
    .expect((r) => assert.equal(r.body.submission.late, true));
});
test('event creation, draft visibility and organizer access work', async () => {
  const b = {
    title: 'Concurrent Workshop',
    description: 'A meaningful workshop',
    category: 'Workshop',
    location: 'Lab 2',
    startsAt: future(2),
    endsAt: future(3),
    capacity: 1,
    status: 'published',
  };
  await as('post', '/api/events', student).send(b).expect(403);
  event = (await as('post', '/api/events', teacher).send(b).expect(201)).body.event;
  const draft = (
    await as('post', '/api/events', teacher)
      .send({ ...b, title: 'Private event', status: 'draft' })
      .expect(201)
  ).body.event;
  await as('get', `/api/events/${draft._id}`, student).expect(404);
  await as('put', `/api/events/${event._id}`, teacher2).send({ title: 'Hijack' }).expect(403);
  await as('get', `/api/events/${event._id}/registrations`, teacher2).expect(403);
  await as('get', '/api/events?q=Concurrent', student)
    .expect(200)
    .expect((r) => assert.equal(r.body.total, 1));
  await as('post', '/api/events', teacher)
    .send({ ...b, endsAt: future(1) })
    .expect(400);
});
test('transactional registration enforces capacity, uniqueness and cancellation', async () => {
  const results = await Promise.all([
    as('post', `/api/events/${event._id}/register`, student),
    as('post', `/api/events/${event._id}/register`, student2),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await Event.findById(event._id)).registrationCount, 1);
  assert.equal(await Registration.countDocuments({ event: event._id }), 1);
  const r = await Registration.findOne({ event: event._id }),
    winner = String(r.student) === String(student._id) ? student : student2;
  await as('post', `/api/events/${event._id}/register`, winner).expect(409);
  await as('get', '/api/events/mine', winner)
    .expect(200)
    .expect((r) => assert.equal(r.body.total, 1));
  await as('put', `/api/events/${event._id}`, teacher).send({ status: 'draft' }).expect(409);
  await as('delete', `/api/events/${event._id}/register`, winner).expect(200);
  assert.equal((await Event.findById(event._id)).registrationCount, 0);
  await as('post', `/api/events/${event._id}/register`, winner).expect(201);
  await as('put', `/api/events/${event._id}`, teacher).send({ status: 'cancelled' }).expect(200);
  await as('delete', `/api/events/${event._id}/register`, winner).expect(200);
  await as('post', `/api/events/${event._id}/register`, winner).expect(409);
});
test('admin provisioning and disabling reject escalation and revoke sessions', async () => {
  await as('get', '/api/users', student).expect(403);
  await as('get', '/api/users', teacher).expect(403);
  await as('post', '/api/users', admin)
    .send({ name: 'New Teacher', email: 'newteacher@campus.example', password, role: 'teacher' })
    .expect(201);
  await as('post', '/api/users', admin)
    .send({ name: 'New Admin', email: 'newadmin@campus.example', password, role: 'admin' })
    .expect(400);
  await as('patch', `/api/users/${admin._id}`, admin).send({ status: 'disabled' }).expect(403);
  const old = token(student2);
  await as('patch', `/api/users/${student2._id}`, admin).send({ status: 'disabled' }).expect(200);
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${old}`).expect(401);
  await request(app).post('/api/auth/login').send({ email: student2.email, password }).expect(401);
  await as('patch', `/api/users/${student2._id}`, admin).send({ status: 'active' }).expect(200);
});
test('profile, password change and logout invalidate old sessions', async () => {
  await as('patch', '/api/auth/me', student).send({ name: 'Updated Student' }).expect(200);
  await as('patch', '/api/auth/me', student).send({ role: 'admin' }).expect(400);
  await as('put', '/api/auth/password', student)
    .send({ currentPassword: 'WrongPassword!', newPassword: 'ChangedPassword2026!' })
    .expect(400);
  const old = token(student);
  await as('put', '/api/auth/password', student)
    .send({ currentPassword: password, newPassword: 'ChangedPassword2026!' })
    .expect(200);
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${old}`).expect(401);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: student.email, password: 'ChangedPassword2026!' })
    .expect(200);
  await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(200);
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(401);
});
test('archiving hides coursework and retains submission records', async () => {
  await as('delete', `/api/assignments/${assignment._id}`, teacher2).expect(404);
  await as('delete', `/api/assignments/${assignment._id}`, admin).expect(200);
  await as('get', `/api/assignments/${assignment._id}`, admin).expect(404);
  assert.ok(await Submission.exists({ _id: submission._id }));
});
test('JSON errors, security headers, CORS, secret isolation and throttling', async () => {
  await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{bad')
    .expect(400);
  await request(app)
    .get('/api/unknown')
    .expect(404)
    .expect((r) => assert.ok(r.body.message));
  await request(app).get('/api/health').expect(200).expect('X-Content-Type-Options', 'nosniff');
  await request(app)
    .get('/api/health')
    .set('Origin', 'https://untrusted.example')
    .expect((r) => assert.equal(r.headers['access-control-allow-origin'], undefined));
  for (const route of ['/.env', '/backend/.env', '/storage/uploads/anything', '/%ZZ'])
    await request(app)
      .get(route)
      .expect((r) => assert.ok(r.status >= 400));
  const limited = createApp({ jwtSecret: secret, uploadDir, authLimit: 1 });
  await request(limited).post('/api/auth/login').send({}).expect(400);
  await request(limited).post('/api/auth/login').send({}).expect(429);
});
