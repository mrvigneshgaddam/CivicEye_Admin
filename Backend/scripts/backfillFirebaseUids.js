const admin = require('firebase-admin');
const mongoose = require('mongoose');
const Police = require('../models/Police');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

admin.initializeApp({
  credential: admin.credential.cert(require('../config/civikeye-chat-firebase-adminsdk-fbsvc-8657afca72.json'))
});

async function backfillFirebaseUids() {
  const officers = await Police.find({ firebaseUid: { $exists: false } });
  for (const officer of officers) {
    let user;
    try {
      user = await admin.auth().getUserByEmail(officer.email);
    } catch (err) {
      // If user not found, create them in Firebase
      user = await admin.auth().createUser({
        email: officer.email,
        displayName: officer.name,
      });
      console.log(`Created Firebase user for ${officer.email}`);
    }

    await Police.findByIdAndUpdate(officer._id, { firebaseUid: user.uid });
    console.log(`Backfilled Firebase UID for ${officer.name}`);
  }

  console.log("All Firebase UIDs backfilled!");
  process.exit(0);
}

backfillFirebaseUids();
