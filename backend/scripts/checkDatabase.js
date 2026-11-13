// Read-only diagnostic: no model initialization, index creation or data writes.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { MongoClient } = require('mongoose').mongo,
  { describe } = require('../lib/startup');
async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from backend/.env. Configure it privately.');
    process.exitCode = 1;
    return;
  }
  let client;
  try {
    client = new MongoClient(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 1,
    });
    await client.connect();
    await client.db(process.env.MONGO_DB_NAME || 'CampusConnect').command({ ping: 1 });
    console.log('Database connection OK. Read-only ping succeeded.');
  } catch (e) {
    console.error(describe(e));
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    console.log('No credentials displayed. No data or indexes changed.');
  }
}
main().catch(() => {
  console.error('Database check could not complete. Values were not logged.');
  process.exitCode = 1;
});
