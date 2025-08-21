// /config/db.js - Fixed version
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);
    console.log('✅ MongoDB connected successfully');
    
    // MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Firebase Admin Initialization
let firebaseInitialized = false;

const initializeFirebase = () => {
  try {
    // Check if Firebase config exists and project ID is provided
    const serviceAccountPath = path.join(__dirname, '../certs/serviceAccountKey.json');
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    
    if (fs.existsSync(serviceAccountPath) && firebaseProjectId) {
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${firebaseProjectId}-default-rtdb.firebaseio.com` // Fixed URL format
      });
      
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      if (!fs.existsSync(serviceAccountPath)) {
        console.log('⚠️ Firebase Service Account not found in certs/ folder.');
      }
      if (!firebaseProjectId) {
        console.log('⚠️ FIREBASE_PROJECT_ID environment variable not set.');
      }
      console.log('⚠️ Firebase features disabled.');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
  }
};

// Get Firebase instances
const getFirebase = () => {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized. Check service account configuration.');
  }
  return {
    admin,
    db: admin.firestore(),
    rtdb: admin.database()
  };
};

module.exports = { 
  connectDB, 
  initializeFirebase, 
  getFirebase, 
  isFirebaseInitialized: () => firebaseInitialized 
};