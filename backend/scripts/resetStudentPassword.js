
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = question =>
  new Promise(resolve => rl.question(question, resolve));

async function resetStudentPassword() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('This script is for development only');
    }

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CampusConnect'
    });

    const email = (await ask('Student email: '))
      .trim()
      .toLowerCase();

    const student = await User.findOne({
      email,
      role: 'student'
    });

    if (!student) {
      console.log('Student account not found');
      return;
    }

    const newPassword = await ask('New password: ');

    if (newPassword.length < 12) {
      console.log('Password must contain at least 12 characters');
      return;
    }

    student.password = await bcrypt.hash(newPassword, 12);
    await student.save();

    console.log('Student password reset successfully');

  } catch (error) {
    console.error('Reset failed:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

resetStudentPassword();

