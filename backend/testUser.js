require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('./models/User');

const testUser = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test student setup is disabled in production');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }

  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  try {
    const email = 'teststudent@campusconnect.example';

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CampusConnect'
    });
    console.log('Connected to MongoDB');

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('Test student already exists. No password was changed.');
      return;
    }

    const password = await rl.question('Enter a temporary password for the test student: ');

    if (password.length < 8 || password.length > 128) {
      console.log('Password must be 8 to 128 characters. No account was created.');
      return;
    }

    const user = await User.create({
      name: 'Test Student',
      email,
      password: await bcrypt.hash(password, 12),
      role: 'student'
    });

    console.log('Test student saved successfully');
    console.log('Student ID:', user._id.toString());
    console.log('Student role:', user.role);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
};

testUser();
