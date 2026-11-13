
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('../models/User');

const accounts = [
  {
    name: 'Demo Teacher',
    email: 'demoteacher@campusconnect.example',
    role: 'teacher'
  },
  {
    name: 'Demo Admin',
    email: 'demoadmin@campusconnect.example',
    role: 'admin'
  }
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test setup is disabled in production');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }

  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  try {
    const confirmation = await rl.question(
      'Create local test teacher/admin accounts? (yes/no): '
    );

    if (confirmation.trim().toLowerCase() !== 'yes') {
      console.log('Cancelled.');
      return;
    }

   
    await mongoose.connect(process.env.MONGO_URI, {
        dbName: 'CampusConnect'
      });
    console.log('Connected to MongoDB');

    for (const account of accounts) {
      const existing = await User.findOne({
        email: account.email
      });

      if (existing) {
        console.log(`${account.role} account already exists. Skipping.`);
        continue;
      }

      const password = await rl.question(
        `Enter a temporary password for ${account.role}: `
      );

      if (password.length < 8 || password.length > 72) {
        console.log('Password must be 8 to 72 characters. Skipping.');
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await User.create({
        name: account.name,
        email: account.email,
        password: hashedPassword,
        role: account.role
      });

      console.log(`${account.role} account created successfully`);
    }

  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error('Setup failed:', error.message);
  process.exitCode = 1;
});
