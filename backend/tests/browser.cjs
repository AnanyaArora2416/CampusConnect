// Real HTTP/browser/database workflows; no Atlas or .env use.
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path'),
  { chromium } = require('playwright'),
  { MongoMemoryReplSet } = require('mongodb-memory-server'),
  mongoose = require('mongoose'),
  { randomBytes } = require('node:crypto'),
  { createApp } = require('../app'),
  connectDB = require('../config/db'),
  { seedDemo } = require('../scripts/seedDemo');
let db, server, browser, uploadDir;
const results = [],
  errors = [],
  csp = [];
const record = (name) => {
  results.push(name);
  console.log('PASS ' + name);
};
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
async function main() {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campusconnect-browser-'));
  const app = createApp({ jwtSecret: randomBytes(48).toString('hex'), uploadDir, authLimit: 1000 });
  await connectDB(db.getUri(), 'CampusConnectBrowserTest');
  await seedDemo();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (require('node:fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const out = path.resolve(__dirname, '../test-results');
  await fs.mkdir(out, { recursive: true });
  const ctx = {};
  for (const role of ['student', 'teacher', 'admin', 'guest']) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1024 },
        acceptDownloads: true,
        reducedMotion: 'reduce',
      }),
      p = await context.newPage();
    p.on('pageerror', (e) => errors.push({ role, message: e.message }));
    p.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text()))
        csp.push(m.text());
    });
    p.on('dialog', (dialog) => dialog.accept());
    ctx[role] = { context, p };
  }
  const login = async (p, email, password = 'CampusDemo2026!') => {
    await p.goto(base + '/login.html');
    await p.locator('#loginEmail').fill(email);
    await p.locator('#loginPassword').fill(password);
    await p.getByRole('button', { name: 'Login →', exact: true }).click();
    await p.waitForURL(/(?:dashboard|teacher-dashboard|admin-dashboard)\.html$/);
    await p.locator('.stats').waitFor();
  };
  const guest = ctx.guest.p,
    teacher = ctx.teacher.p,
    student = ctx.student.p,
    admin = ctx.admin.p;
  await guest.goto(base + '/admin-dashboard.html');
  await guest.waitForURL('**/login.html');
  record('Anonymous visitors are redirected from protected pages');
  await guest.goto(base + '/register.html');
  await guest.locator('#registerName').fill('Browser Student');
  await guest.locator('#registerEmail').fill('browser@campus.example');
  await guest.locator('#registerPassword').fill('BrowserPassword2026!');
  await guest.locator('#confirmPassword').fill('BrowserPassword2026!');
  await guest.getByRole('button', { name: 'Register →' }).click();
  await guest
    .getByText('Account created. Use the Login link below to sign in.', { exact: true })
    .waitFor();
  await login(guest, 'browser@campus.example', 'BrowserPassword2026!');
  record('Student registration and login work through actual forms');
  await login(teacher, 'teacher@campus.local');
  await login(student, 'student@campus.local');
  await login(admin, 'admin@campus.local');
  record('All three roles sign in to their own dashboards');
  const localFuture = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  await teacher.goto(base + '/create-assignment.html');
  await teacher.locator('#title').fill('Browser-created coursework');
  await teacher.locator('#subject').fill('Full-stack testing');
  await teacher.locator('#maxMarks').fill('40');
  await teacher.locator('#dueDate').fill(localFuture(4));
  await teacher.locator('#status').selectOption('published');
  await teacher.locator('#description').fill('Build a real connected campus workflow.');
  await teacher.getByRole('button', { name: '+ Add requirement' }).click();
  await teacher.locator('.requirement-title').fill('Working API');
  await teacher.locator('.requirement-description').fill('Connect a tested API.');
  await teacher.getByRole('button', { name: 'Save assignment', exact: true }).click();
  await teacher.waitForURL('**/assignment-details.html?id=*');
  await teacher.locator('#resourceForm').waitFor();
  const assignmentURL = teacher.url();
  await teacher
    .locator('#resourceFile')
    .setInputFiles({ name: 'guide.pdf', mimeType: 'application/pdf', buffer: pdf });
  await teacher.getByRole('button', { name: 'Upload resource' }).click();
  await teacher.locator('.resource').waitFor();
  record('Teacher creates and publishes coursework with requirements and private resource');
  await student.goto(base + '/assignments.html?q=Browser-created');
  await student.getByRole('heading', { name: '1 assignment', exact: true }).waitFor();
  await student.getByRole('link', { name: 'View details' }).click();
  await student.getByRole('heading', { name: 'Browser-created coursework', exact: true }).waitFor();
  record('Incoming search queries and real assignment IDs work');
  await student
    .locator('#submissionFile')
    .setInputFiles({ name: 'student-work.pdf', mimeType: 'application/pdf', buffer: pdf });
  await student.getByRole('button', { name: 'Submit assignment', exact: true }).click();
  await student.getByRole('dialog').waitFor();
  const receiptId = await student.locator('#receiptContent dd').first().textContent();
  assert.match(receiptId, /^[a-f\d]{24}$/);
  await student.screenshot({ path: path.join(out, 'submission-receipt.png'), fullPage: true });
  await student.getByRole('button', { name: 'Close receipt' }).click();
  await student.reload();
  await student.getByText(receiptId, { exact: true }).waitFor();
  const download = student.waitForEvent('download');
  await student.getByRole('button', { name: 'Download submitted file' }).click();
  assert.equal((await download).suggestedFilename(), 'student-work.pdf');
  record('Saved submission receipt survives refresh and private download works');
  await teacher.goto(assignmentURL);
  await teacher.locator('[data-grade]').waitFor();
  await teacher.locator('[name=grade]').fill('35');
  await teacher.locator('[name=feedback]').fill('Excellent integrated workflow.');
  await teacher.getByRole('button', { name: 'Save grade' }).click();
  await teacher.getByText('Grade and feedback saved', { exact: true }).waitFor();
  await student.reload();
  await student.getByText('35 / 40', { exact: true }).waitFor();
  await student.getByText('Excellent integrated workflow.', { exact: true }).waitFor();
  record('Teacher grades persist and students see saved feedback');
  await teacher.goto(base + '/create-event.html');
  await teacher.locator('#title').fill('Browser-created workshop');
  await teacher.locator('#location').fill('Innovation Lab');
  await teacher.locator('#startsAt').fill(localFuture(6));
  await teacher.locator('#endsAt').fill(localFuture(7));
  await teacher.locator('#capacity').fill('10');
  await teacher.locator('#status').selectOption('published');
  await teacher.locator('#description').fill('Connect, build, and share a working project.');
  await teacher.getByRole('button', { name: 'Save event', exact: true }).click();
  await teacher.waitForURL('**/event-details.html?id=*');
  await teacher.getByRole('heading', { name: 'Browser-created workshop', exact: true }).waitFor();
  const eventURL = teacher.url();
  await student.goto(eventURL);
  await student.getByRole('button', { name: 'Register for event', exact: true }).click();
  await student.getByText('You are registered for this event.', { exact: true }).waitFor();
  await student.goto(base + '/my-events.html');
  await student.getByRole('heading', { name: 'Browser-created workshop' }).waitFor();
  await student.getByRole('button', { name: 'Cancel registration', exact: true }).click();
  await student
    .getByText('No registrations yet. Explore campus events to get started.', { exact: true })
    .waitFor();
  record('Event create, register, My events and cancellation persist');
  await admin.goto(base + '/admin-dashboard.html?view=users');
  await admin.locator('#newName').fill('Browser Teacher');
  await admin.locator('#newEmail').fill('browser.teacher@campus.example');
  await admin.locator('#newPassword').fill('TemporaryPassword2026!');
  await admin.getByRole('button', { name: 'Create account', exact: true }).click();
  await admin.getByText('browser.teacher@campus.example', { exact: true }).waitFor();
  const row = admin.getByRole('row').filter({ hasText: 'browser.teacher@campus.example' });
  await row.getByRole('button', { name: 'Disable access' }).click();
  await row.getByText('disabled', { exact: true }).waitFor();
  record('Admin provisions teacher accounts and disables access through UI');
  await student.goto(base + '/admin-dashboard.html');
  await student.waitForURL('**/dashboard.html');
  await student.locator('.stats').waitFor();
  record('Student cannot open administrator pages');
  await guest.goto(base + '/profile.html');
  await guest.locator('#name').fill('Updated Browser Student');
  await guest.getByRole('button', { name: 'Save profile', exact: true }).click();
  await guest.getByText('Profile updated', { exact: true }).waitFor();
  await guest.locator('#currentPassword').fill('BrowserPassword2026!');
  await guest.locator('#newPassword').fill('ChangedBrowser2026!');
  await guest.locator('#confirmPassword').fill('ChangedBrowser2026!');
  await guest.getByRole('button', { name: 'Change password', exact: true }).click();
  await guest.waitForURL('**/login.html?expired=1');
  await login(guest, 'browser@campus.example', 'ChangedBrowser2026!');
  await guest.getByRole('button', { name: 'Sign out', exact: true }).click();
  await guest.waitForURL('**/login.html');
  assert.equal(await guest.evaluate(() => sessionStorage.getItem('campusconnect_token')), null);
  record('Profile, password changes and logout complete end to end');
  const pages = [
    ['index.html', 'guest'],
    ['login.html', 'guest'],
    ['register.html', 'guest'],
    ['dashboard.html', 'student'],
    ['assignments.html', 'student'],
    [assignmentURL.split('/').pop(), 'student'],
    ['events.html', 'student'],
    [eventURL.split('/').pop(), 'student'],
    ['my-events.html', 'student'],
    ['profile.html', 'student'],
    ['teacher-dashboard.html', 'teacher'],
    ['create-assignment.html', 'teacher'],
    ['create-event.html', 'teacher'],
    ['admin-dashboard.html', 'admin'],
    ['admin-dashboard.html?view=users', 'admin'],
  ];
  for (const width of [1440, 390])
    for (const [route, role] of pages) {
      const p = ctx[role].p;
      await p.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
      await p.goto(base + '/' + route);
      if (!['index.html', 'login.html', 'register.html'].includes(route))
        await p.locator('main[aria-busy=false]').waitFor();
      assert.equal(
        await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `Overflow: ${route}, ${width}`,
      );
      if (route === 'dashboard.html') {
        assert.equal(await p.getByRole('button', { name: 'Sign out' }).isVisible(), true);
        await p.screenshot({
          path: path.join(out, `student-dashboard-${width}.png`),
          fullPage: true,
        });
      }
      if (
        width === 1440 &&
        ['events.html', 'teacher-dashboard.html', 'admin-dashboard.html?view=users'].includes(route)
      )
        await p.screenshot({
          path: path.join(
            out,
            route.startsWith('events')
              ? 'campus-events.png'
              : route.startsWith('teacher')
                ? 'teacher-dashboard.png'
                : 'admin-users.png',
          ),
          fullPage: true,
        });
    }
  record('15 page states at two breakpoints have no document overflow; mobile sign-out visible');
  await ctx.student.context.route('**/api/dashboard', (r) =>
    r.fulfill({ status: 503, json: { message: 'Temporary service outage' } }),
  );
  await student.goto(base + '/dashboard.html');
  await student.getByText('Temporary service outage', { exact: true }).waitFor();
  await ctx.student.context.unroute('**/api/dashboard');
  await student.getByRole('button', { name: 'Try again' }).click();
  await student.locator('.stats').waitFor();
  await student.evaluate(() => sessionStorage.setItem('campusconnect_token', 'invalid-token'));
  await student.goto(base + '/dashboard.html');
  await student.waitForURL('**/login.html?expired=1');
  await login(student, 'student@campus.local');
  record('API outages expose retry and expired sessions redirect');
  const axe = await fs.readFile(require.resolve('axe-core/axe.min.js'), 'utf8'),
    accessibility = [];
  for (const [route, role] of [
    ['dashboard.html', 'student'],
    ['create-assignment.html', 'teacher'],
    ['admin-dashboard.html?view=users', 'admin'],
    ['login.html', 'guest'],
    ['register.html', 'guest'],
  ]) {
    const p = ctx[role].p;
    await p.setViewportSize({ width: 1440, height: 1024 });
    await p.goto(base + '/' + route);
    if (role !== 'guest') await p.locator('main[aria-busy=false]').waitFor();
    await p.evaluate(axe);
    const violations = await p.evaluate(async () =>
      (
        await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
      ).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    accessibility.push({ route, violations });
  }
  await fs.writeFile(path.join(out, 'accessibility.json'), JSON.stringify(accessibility, null, 2));
  assert.deepEqual(
    accessibility.filter((a) => a.violations.length),
    [],
  );
  record('Five representative screens pass automated WCAG A/AA checks');
  assert.deepEqual(errors, []);
  assert.deepEqual(csp, []);
  record('No uncaught JavaScript exceptions or CSP violations');
  await fs.writeFile(
    path.join(out, 'browser-summary.json'),
    JSON.stringify({ results, errors, csp }, null, 2),
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (db) await db.stop();
    if (uploadDir) await fs.rm(uploadDir, { recursive: true, force: true });
  });
