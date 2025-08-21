const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    // Mock dashboard stats - replace with actual data
    const stats = {
      totalUsers: 150,
      activeUsers: 45,
      totalMessages: 1280,
      conversations: 89,
      newUsersThisWeek: 12,
      systemStatus: 'operational'
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
});

// GET /api/dashboard/activity
router.get('/activity', auth, async (req, res) => {
  try {
    // Mock recent activity
    const activity = [
      {
        id: 1,
        type: 'user_login',
        message: 'User logged in',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        user: 'user123'
      },
      {
        id: 2,
        type: 'message_sent',
        message: 'New message sent',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        user: 'user456'
      }
    ];

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity'
    });
  }
});

module.exports = router;