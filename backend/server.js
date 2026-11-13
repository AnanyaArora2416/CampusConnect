// The production/development entry point always uses your configured MongoDB; no silent demo fallback.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { createApp } = require('./app'),
  connectDB = require('./config/db'),
  { describe } = require('./lib/startup');
async function main() {
  const { MONGO_URI, JWT_SECRET } = process.env;
  if (!MONGO_URI || !JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32) {
    console.error(
      'Configure MONGO_URI and a JWT_SECRET of at least 32 bytes in backend/.env. Values were not displayed.',
    );
    process.exitCode = 1;
    return;
  }
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer from 1 to 65535');
    process.exitCode = 1;
    return;
  }
  const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    origins.some((s) => {
      try {
        return new URL(s).origin !== s;
      } catch {
        return true;
      }
    })
  ) {
    console.error('FRONTEND_ORIGINS must list valid origins without paths');
    process.exitCode = 1;
    return;
  }
  const config = {
    jwtSecret: JWT_SECRET,
    allowedOrigins: origins,
    production: process.env.NODE_ENV === 'production',
  };
  if (process.env.UPLOAD_DIR) config.uploadDir = path.resolve(process.env.UPLOAD_DIR);
  if (process.env.TRUST_PROXY_HOPS) {
    const hops = Number(process.env.TRUST_PROXY_HOPS);
    if (!Number.isInteger(hops) || hops < 1 || hops > 5) {
      console.error('TRUST_PROXY_HOPS must be from 1 to 5');
      process.exitCode = 1;
      return;
    }
    config.trustProxy = hops;
  }
  const app = createApp(config);
  try {
    await connectDB(MONGO_URI, process.env.MONGO_DB_NAME || 'CampusConnect');
  } catch (e) {
    console.error(describe(e));
    console.error('Server did not start. Run npm run check-db. No credentials were logged.');
    await require('mongoose').disconnect();
    process.exitCode = 1;
    return;
  }
  const server = app.listen(port, () =>
    console.log(`CampusConnect: http://localhost:${port} (configured MongoDB)`),
  );
  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? 'Port is already in use. Stop the other server or choose another PORT.'
        : 'HTTP server could not start.',
    );
    require('mongoose')
      .disconnect()
      .finally(() => {
        process.exitCode = 1;
      });
  });
  const stop = () =>
    server.close(async () => {
      await require('mongoose').disconnect();
      process.exit(0);
    });
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
main().catch(() => {
  console.error('Startup failed. Configuration values were not logged.');
  process.exitCode = 1;
});
