// Operator-only account bootstrap and recovery, with hidden password entry.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const readline = require('node:readline/promises'),
  { Writable } = require('node:stream'),
  mongoose = require('mongoose'),
  bcrypt = require('bcryptjs'),
  User = require('../models/User'),
  v = require('../lib/utils');
async function main() {
  if (!process.stdin.isTTY || !process.env.MONGO_URI)
    throw Error('Interactive terminal and private database configuration required');
  const reset = process.argv[2] === 'reset';
  let muted = false;
  const output = new Writable({
      write(chunk, encoding, cb) {
        if (!muted) process.stdout.write(chunk);
        cb();
      },
    }),
    rl = readline.createInterface({ input: process.stdin, output, terminal: true });
  try {
    console.log(
      reset
        ? 'This changes one account password and revokes its sessions.'
        : 'This creates one account in the configured database; existing users are not overwritten.',
    );
    if (
      (await rl.question(`Type ${reset ? 'RESET' : 'CREATE'} to continue: `)) !==
      (reset ? 'RESET' : 'CREATE')
    )
      return;
    const email = v.email(await rl.question('Account email: '));
    let name, role;
    if (!reset) {
      name = v.text(await rl.question('Full name: '), 'Name', 100, 2);
      role = v.choice(await rl.question('Role (student/teacher/admin): '), 'role', [
        'student',
        'teacher',
        'admin',
      ]);
    }
    process.stdout.write('Temporary password (hidden): ');
    muted = true;
    const password = v.password(await rl.question(''));
    muted = false;
    process.stdout.write('\n');
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'CampusConnect',
      serverSelectionTimeoutMS: 10000,
    });
    if (reset) {
      const result = await User.updateOne(
        { email },
        { $set: { password: await bcrypt.hash(password, 12) }, $inc: { tokenVersion: 1 } },
      );
      console.log(
        result.matchedCount
          ? 'Password changed; existing sessions revoked.'
          : 'Account not found. No changes made.',
      );
    } else {
      await User.init();
      await User.create({ name, email, role, password: await bcrypt.hash(password, 12) });
      console.log('Account created. Share the temporary password privately.');
    }
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}
main().catch(() => {
  console.error(
    'Account operation failed. Check input, duplicate email and database access. No configuration values were logged.',
  );
  process.exitCode = 1;
});
