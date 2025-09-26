// cleanup-conversations.js
const admin = require('firebase-admin');
const mongoose = require('mongoose');

// Initialize Firebase
const serviceAccount = require('../config/civikeye-chat-firebase-adminsdk-fbsvc-8657afca72.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://civikeye-chat-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const Police = require('../models/Police'); // Adjust path as needed

async function cleanupOutdatedConversations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye');
    console.log('✅ Connected to MongoDB');

    // Get all police officers with their current Firebase UIDs
    const officers = await Police.find({ firebaseUid: { $exists: true, $ne: null } })
      .select('firebaseUid name email')
      .lean();

    const validFirebaseUids = officers.map(o => o.firebaseUid);
    console.log(`✅ Found ${validFirebaseUids.length} valid Firebase UIDs in MongoDB`);

    // Get all conversations from Firestore
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef.get();

    let updatedCount = 0;
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      const conversation = doc.data();
      const participants = conversation.participants || [];

      // Check if any participant has an outdated Firebase UID
      const outdatedParticipants = participants.filter(uid => 
        !validFirebaseUids.includes(uid)
      );

      if (outdatedParticipants.length > 0) {
        console.log(`🔄 Conversation ${doc.id} has outdated participants:`, outdatedParticipants);
        
        // Remove outdated participants
        const validParticipants = participants.filter(uid => 
          validFirebaseUids.includes(uid)
        );

        if (validParticipants.length >= 2) {
          // Update conversation with only valid participants
          await conversationsRef.doc(doc.id).update({
            participants: validParticipants
          });
          updatedCount++;
          console.log(`✅ Updated conversation ${doc.id}`);
        } else {
          // Delete conversation if not enough valid participants
          await conversationsRef.doc(doc.id).delete();
          deletedCount++;
          console.log(`🗑️ Deleted conversation ${doc.id} (not enough valid participants)`);
        }
      }
    }

    console.log(`\n📊 Cleanup completed:`);
    console.log(`✅ Updated conversations: ${updatedCount}`);
    console.log(`🗑️ Deleted conversations: ${deletedCount}`);
    console.log(`✅ Total conversations processed: ${snapshot.size}`);

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanupOutdatedConversations();