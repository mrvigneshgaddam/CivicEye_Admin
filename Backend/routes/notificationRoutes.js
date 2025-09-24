const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');
const auth = require('../middlewares/auth');  // Import the middleware

// Protect the route using the auth middleware
router.get('/', auth, getNotifications);

module.exports = router;
