// Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, requireAdmin } = require('../middlewares/auth');

/////////////////////////////
// MongoDB Auth Routes ONLY
/////////////////////////////

// Register new MongoDB police officer
router.post('/register', authController.registerMongo);

// Login MongoDB police officer
router.post('/login', authController.loginMongo);

// Get current MongoDB police officer profile
router.get('/me', auth, authController.getCurrentUserMongo);

// Validate MongoDB JWT token
router.get('/validate', auth, authController.validateTokenMongo);

// Check if account is locked
router.get('/check-lock/:policeId', authController.checkAccountLock);

// Unlock account (admin function)
router.post('/unlock-account', auth, requireAdmin, authController.unlockAccount);

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
