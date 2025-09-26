// config/db.js
const mongoose = require('mongoose');

/* --------------------- MongoDB Connection ---------------------- */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';
  
  // Event listeners before connecting
  mongoose.connection.on('connected', () => console.log('MongoDB event: connected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB event: error', err));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB event: disconnected'));

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Remove all Firebase-related functions
module.exports = {
  connectDB
  // Remove: initializeFirebase, getFirebase, isFirebaseInitialized
};