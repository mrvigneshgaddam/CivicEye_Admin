// Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);
router.get('/verify',  ctrl.verify);
module.exports = router;