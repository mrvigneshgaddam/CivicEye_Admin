// Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const admin = require("../config/firebase");
const Police = require("../models/Police");

/* ------------------------ AUTH ROUTES ------------------------ */

// Login route
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);

// Get current user info (protected)
router.get('/me', auth, authController.me);

// Verify token
router.post('/verify', authController.verify);

// Refresh Firebase token
router.post('/refresh-firebase-token', auth, authController.refreshFirebaseToken);

/* ------------------ FIREBASE TOKEN ENDPOINT ------------------ */
router.post("/get-firebase-token", auth, async (req, res) => {
  try {
    const { email, firebaseUid } = req.body;

    if (!email && !firebaseUid) {
      return res.status(400).json({
        success: false,
        message: "Email or Firebase UID is required",
      });
    }

    // Find officer in MongoDB
    let officer = await Police.findOne({
      $or: [{ email }, { firebaseUid }, { _id: req.user.id }]
    });

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found in database",
      });
    }

    // Ensure Firebase user exists
    let fbUser;
    try {
      if (officer.firebaseUid) {
        fbUser = await admin.auth().getUser(officer.firebaseUid);
      } else {
        fbUser = await admin.auth().getUserByEmail(officer.email);
        officer.firebaseUid = fbUser.uid;
        await officer.save();
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create Firebase user
        fbUser = await admin.auth().createUser({
          email: officer.email,
          displayName: officer.name,
          photoURL: officer.profilePic || null,
          disabled: officer.status !== 'Active'
        });
        officer.firebaseUid = fbUser.uid;
        await officer.save();
      } else {
        throw error;
      }
    }

    // Generate Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(officer.firebaseUid);

    return res.json({
      success: true,
      firebaseToken,
      firebaseUid: officer.firebaseUid,
      user: {
        _id: officer._id,
        name: officer.name,
        email: officer.email,
        profilePic: officer.profilePic,
        firebaseUid: officer.firebaseUid,
      },
    });

  } catch (err) {
    console.error("❌ Error in /get-firebase-token:", err);
    return res.status(500).json({
      success: false,
      message: "Server error generating Firebase token",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* ------------------ BULK FIREBASE SYNC ------------------ */
router.post("/bulk-sync-firebase", auth, async (req, res) => {
  try {
    // Only allow admins to run bulk sync
    const requestingUser = await Police.findById(req.user.id);
    if (!requestingUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const officers = await Police.find({});
    const results = [];

    for (const officer of officers) {
      try {
        await authController.syncUserWithFirebase(officer);
        results.push({
          email: officer.email,
          status: 'success',
          firebaseUid: officer.firebaseUid
        });
      } catch (error) {
        results.push({
          email: officer.email,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Firebase sync completed for ${officers.length} users`,
      results
    });

  } catch (error) {
    console.error("Bulk sync error:", error);
    res.status(500).json({
      success: false,
      message: "Bulk sync failed"
    });
  }
});

module.exports = router;