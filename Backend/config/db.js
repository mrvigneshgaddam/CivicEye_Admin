// config/db.js
const mongoose = require('mongoose');
const admin = require('firebase-admin');

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
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
let firebaseAdmin = null;
let firestoreDB = null;

const initializeFirebase = () => {
  try {
    // Check if Firebase config exists
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_PRIVATE_KEY && 
        process.env.FIREBASE_CLIENT_EMAIL) {
      
      // Replace escaped newlines in private key
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      
      firestoreDB = firebaseAdmin.firestore();
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('⚠️ Firebase credentials not found. Firebase features will be disabled.');
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
    admin: firebaseAdmin,
    db: firestoreDB
  };
};

module.exports = { 
  connectDB, 
  initializeFirebase, 
  getFirebase, 
  isFirebaseInitialized: () => firebaseInitialized,
  admin: firebaseAdmin
};