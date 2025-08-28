const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { login, register, me } = require('../controllers/authController');

router.post('/login', login);
// comment out register in production:
// router.post('/register', register);

router.get('/me', auth, me);

module.exports = router;