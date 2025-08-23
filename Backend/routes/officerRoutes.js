const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

// GET /api/officers
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Officers endpoint',
    data: []
  });
});

module.exports = router;