// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const { authLimiter } = require('../config/security');

// Apply rate limiting to all auth routes
router.use(authLimiter);

/////////////////////////////
// Firebase Auth Routes
/////////////////////////////

// Login with Firebase ID token
router.post('/login/firebase', authController.loginFirebase);

// Logout Firebase user
router.post('/logout/firebase', authenticateToken, authController.logoutFirebase);

// Get Firebase user profile
router.get('/profile/firebase', authenticateToken, authController.getProfileFirebase);

// Update Firebase user profile
router.put('/profile/firebase', authenticateToken, authController.updateProfileFirebase);

/////////////////////////////
// MongoDB Auth Routes
/////////////////////////////

// Register new MongoDB user
router.post('/register', authController.registerMongo);

// Login MongoDB user
router.post('/login', authController.loginMongo);

// Get current MongoDB user profile
router.get('/me', authenticateToken, authController.getCurrentUserMongo);

// Validate MongoDB token
router.get('/validate', authenticateToken, authController.validateTokenMongo);

// Logout MongoDB user (dummy route)
router.post('/logout', (req, res) => res.json({ message: 'Logout successful' }));

module.exports = router;
