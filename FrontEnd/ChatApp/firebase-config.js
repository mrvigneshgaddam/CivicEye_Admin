// firebase-config.js
// Keep compat to avoid module tooling; no settings() after start.

const firebaseConfig = {
  apiKey: "AIzaSyA4jEkTJpjY98Btsqm2A-_5ycQBUvvGTuA",
  authDomain: "civikeye-chat.firebaseapp.com",
  projectId: "civikeye-chat",
  storageBucket: "civikeye-chat.firebasestorage.app",
  messagingSenderId: "18367232043",
  appId: "1:18367232043:web:3590ccd8a59f772e95d26e",
  measurementId: "G-CRTF4KNR3E"
};

// Initialize once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// TIP: set Firestore cache if you need offline (optional & safe before use)
// db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
