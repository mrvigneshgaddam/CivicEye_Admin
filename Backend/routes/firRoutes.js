const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

// GET /api/fir
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'FIR endpoint',
    data: []
  });
});

module.exports = router;