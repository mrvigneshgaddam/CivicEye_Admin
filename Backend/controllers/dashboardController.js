const User = require('../models/User');
const FIR = require('../models/firModel');
const Message = require('../models/Message');

async function getDashboardData(req, res) {
  try {
    // Minimal test response
    res.status(200).json({ success: true, message: 'Dashboard works' });
  } catch (error) {
    console.error('Dashboard controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// ✅ Export as a named export
module.exports = { getDashboardData };
