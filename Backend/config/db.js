// config/db.js
const mongoose = require('mongoose');
const admin = require('firebase-admin');

let firebaseInitialized = false;
let firebaseAdmin = null;
let firestoreDB = null;

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

/* -------------------- Firebase Admin Init --------------------- */
const initializeFirebase = () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL) {

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey,
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
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err.message);
  }
};

/* ------------------ Firebase Getter -------------------- */
const getFirebase = () => {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized. Check service account configuration.');
  }
  return { admin: firebaseAdmin, db: firestoreDB };
};

module.exports = {
  connectDB,
  initializeFirebase,
  getFirebase,
  isFirebaseInitialized: () => firebaseInitialized
};
