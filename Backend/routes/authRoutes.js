// Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

// Login route - uses the actual auth controller
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);
// Logout route
router.post('/logout', authController.logout);

// Get current user info (protected route)
router.get('/me', auth, authController.me);

// Verify token route
router.post('/verify', authController.verify);

module.exports = router;
