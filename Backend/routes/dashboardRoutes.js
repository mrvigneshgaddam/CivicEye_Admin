// Backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Emergency = require('../models/Emergency');
const FIR = require('../models/firModel');
const Conversation = require('../models/Conversation');
// Remove or comment out this line since it's not being used:
// const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Get counts from various collections
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalEmergencies = await Emergency.countDocuments();
    const pendingEmergencies = await Emergency.countDocuments({ status: 'pending' });
    const totalFIRs = await FIR.countDocuments();
    
    // Get message count from last 24 hours using your Message model
    const recentMessages = await Message.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get department-wise counts
    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalEmergencies,
        pendingEmergencies,
        totalFIRs,
        recentMessages,
        departmentStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// GET /api/dashboard/activity - Get user activity data
router.get('/activity', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent users with their last activity
    const recentUsers = await User.find({ isActive: true })
      .sort({ lastSeen: -1 })
      .limit(parseInt(limit))
      .select('name email department lastSeen')
      .lean();

    // Get recent emergencies
    const recentEmergencies = await Emergency.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reportedBy', 'name')
      .lean();

    // Get recent messages with user info
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'name department')
      .lean();

    // Format the activity data
    const activityData = [
      ...recentUsers.map(user => ({
        type: 'user_activity',
        title: `${user.name} (${user.department}) was active`,
        timestamp: user.lastSeen,
        user: user.name,
        icon: 'user'
      })),
      ...recentEmergencies.map(emergency => ({
        type: 'emergency',
        title: `Emergency reported: ${emergency.type}`,
        timestamp: emergency.createdAt,
        user: emergency.reportedBy?.name || 'Unknown',
        icon: 'emergency'
      })),
      ...recentMessages.map(message => ({
        type: 'message',
        title: `Message sent by ${message.sender?.name || 'Unknown'}`,
        timestamp: message.createdAt,
        user: message.sender?.name || 'Unknown',
        icon: 'message'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: activityData
    });
  } catch (error) {
    console.error('Activity data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity data'
    });
  }
});

// GET /api/dashboard/charts - Get charts data
router.get('/charts', auth, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Calculate date range based on period
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get user registration data for the period
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get emergency reports by type
    const emergenciesByType = await Emergency.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get message statistics by type
    const messagesByType = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get message volume over time
    const messageVolume = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        userRegistrations,
        emergenciesByType,
        messagesByType,
        messageVolume
      }
    });
  } catch (error) {
    console.error('Charts data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch charts data'
    });
  }
});

// GET /api/dashboard/messages - Get message statistics
router.get('/messages', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get message statistics by type and date
    const messages = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$messageType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get message status distribution
    const messageStatus = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top senders
    const topSenders = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          'user.name': 1,
          'user.department': 1,
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        messagesByDate: messages,
        messageStatus,
        topSenders
      }
    });
  } catch (error) {
    console.error('Messages stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message statistics'
    });
  }
});

// GET /api/notifications - Get user notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;
    
    const query = { userId: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('relatedTo')
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// GET /api/dashboard/conversations - Get conversation statistics
router.get('/conversations', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get conversation statistics
    const conversationStats = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgParticipants: { $avg: { $size: '$participants' } }
        }
      }
    ]);

    // Get messages per conversation
    const messagesPerConversation = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$conversation',
          messageCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgMessages: { $avg: '$messageCount' },
          maxMessages: { $max: '$messageCount' },
          minMessages: { $min: '$messageCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        conversationStats,
        messagesPerConversation: messagesPerConversation[0] || {}
      }
    });
  } catch (error) {
    console.error('Conversation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation statistics'
    });
  }
});

module.exports = router;