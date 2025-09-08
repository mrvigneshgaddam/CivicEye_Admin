// Backend/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getSettings,
  saveSettings,
  handleLoginAttempt,
  unlockAccount,
  checkAccountLock,
  getSettingsByPoliceId,
  updateSettingsByPoliceId
} = require('../controllers/settingsController');

// Public routes
router.post('/login-attempt', handleLoginAttempt);
router.get('/check-lock/:policeId', checkAccountLock);

// Authenticated routes
router.get('/', auth, getSettings);
router.put('/:section', auth, saveSettings);
router.post('/unlock-account', auth, unlockAccount);

// Admin routes
router.get('/admin/:policeId', auth, getSettingsByPoliceId);
router.put('/admin/:policeId', auth, updateSettingsByPoliceId);

module.exports = router;