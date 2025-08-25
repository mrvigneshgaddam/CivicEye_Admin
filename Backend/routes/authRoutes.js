// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');

/////////////////////////////
// MongoDB Auth Routes ONLY
/////////////////////////////

// Register new MongoDB user
router.post('/register', authController.registerMongo);

// Login MongoDB user
router.post('/login', authController.loginMongo);

// Get current MongoDB user profile
router.get('/me', auth, authController.getCurrentUserMongo);

// Validate MongoDB token
router.get('/validate', auth, authController.validateTokenMongo);

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'Logout successful' 
  });
});

module.exports = router;