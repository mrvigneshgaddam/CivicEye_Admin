const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

// GET /api/profile
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Profile endpoint',
    data: req.user
  });
});

module.exports = router;