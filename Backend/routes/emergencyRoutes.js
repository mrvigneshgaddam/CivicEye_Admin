const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

// GET /api/emergency
router.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Emergency endpoint',
    data: []
  });
});

module.exports = router;