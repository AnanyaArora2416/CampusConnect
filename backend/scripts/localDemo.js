// Explicit disposable demo. Never reads .env or connects to Atlas.
const { MongoMemoryReplSet } = require('mongodb-memory-server'),
  mongoose = require('mongoose'),
  { randomBytes } = require('node:crypto'),
  os = require('node:os'),
  path = require('node:path'),
  fs = require('node:fs/promises'),
  { createApp } = require('../app'),
  connectDB = require('../config/db'),
  { seedDemo } = require('./seedDemo');
async function main() {
  const db = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    }),
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'campusconnect-demo-'));
  const app = createApp({ jwtSecret: randomBytes(48).toString('hex'), uploadDir });
  await connectDB(db.getUri(), 'CampusConnectLocalDemo');
  await seedDemo();
  const port = Number(process.env.DEMO_PORT || 5000),
    server = app.listen(port, '127.0.0.1', () => {
      console.log(`Disposable local demo: http://localhost:${port}`);
      console.log('Accounts: student@campus.local / teacher@campus.local / admin@campus.local');
      console.log('Demo password: CampusDemo2026!');
      console.log('DEMO ONLY: Atlas is not used. Data is temporary.');
    });
  const stop = () =>
    server.close(async () => {
      await mongoose.disconnect();
      await db.stop();
      await fs.rm(uploadDir, { recursive: true, force: true });
      process.exit(0);
    });
  server.on('error', async () => {
    console.error('Demo could not listen; check whether the port is already in use.');
    await mongoose.disconnect();
    await db.stop();
    await fs.rm(uploadDir, { recursive: true, force: true });
    process.exitCode = 1;
  });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
main().catch(() => {
  console.error('Demo startup failed. Check dependencies and the MongoDB binary download.');
  process.exitCode = 1;
});
