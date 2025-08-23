const mongoose = require('mongoose');
const argon2 = require('argon2');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Reset all user passwords with default
const fixUserPasswords = async () => {
  try {
    const User = require('../models/User');

    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    const defaultPassword = 'ChangeMe123!';
    let resetCount = 0;

    for (const user of users) {
      // Force reset password for all users
      user.password = await argon2.hash(defaultPassword);
      user.isActive = true; // ensure user can log in
      await user.save();
      resetCount++;
      console.log(`Reset password for: ${user.email}`);
    }

    console.log(`\nMigration complete:`);
    console.log(`- Reset ${resetCount} user passwords`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing passwords:', error);
    process.exit(1);
  }
};

// Run the script
connectDB().then(() => fixUserPasswords());
