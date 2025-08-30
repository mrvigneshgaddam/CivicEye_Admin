// Backend/routes/authRoutes.js
const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);
router.get('/verify', auth, ctrl.verify);
module.exports = router;