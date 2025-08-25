const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Emergency = require('../models/Emergency');
const FIR = require('../models/firModel');
const Police = require('../models/Police');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

const dashboardController = {
  getDashboardStats: async (req, res) => {
    try {
      // Get current date and dates for trend calculation
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all statistics in parallel
      const [
        totalUsers,
        activeUsers,
        totalConversations,
        totalMessages,
        pendingEmergencies,
        inProgressEmergencies,
        resolvedEmergencies,
        filedFIRs,
        underInvestigationFIRs,
        closedFIRs,
        activeOfficers,
        offDutyOfficers,
        pendingReports,
        inProgressReports,
        resolvedReports,
        unreadNotifications,
        
        // Previous period data for trends
        prevActiveUsers,
        prevEmergencies,
        prevOfficers,
        prevMessages
      ] = await Promise.all([
        // Current period stats
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Conversation.countDocuments(),
        Message.countDocuments(),
        Emergency.countDocuments({ status: 'pending' }),
        Emergency.countDocuments({ status: 'in-progress' }),
        Emergency.countDocuments({ status: 'resolved' }),
        FIR.countDocuments({ status: 'filed' }),
        FIR.countDocuments({ status: 'under-investigation' }),
        FIR.countDocuments({ status: 'closed' }),
        Police.countDocuments({ status: 'On Duty' }),
        Police.countDocuments({ status: 'Off Duty' }),
        Report.countDocuments({ status: 'Pending' }),
        Report.countDocuments({ status: 'In Progress' }),
        Report.countDocuments({ status: 'Resolved' }),
        Notification.countDocuments({ read: false }),
        
        // Previous period stats for trends
        User.countDocuments({ 
          isActive: true, 
          createdAt: { $lte: thirtyDaysAgo } 
        }),
        Emergency.countDocuments({ 
          createdAt: { $lte: thirtyDaysAgo } 
        }),
        Police.countDocuments({ 
          status: 'On Duty', 
          createdAt: { $lte: thirtyDaysAgo } 
        }),
        Message.countDocuments({ 
          createdAt: { $lte: thirtyDaysAgo } 
        })
      ]);

      // Calculate trends
      const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const trends = {
        activeUsers: parseFloat(calculateTrend(activeUsers, prevActiveUsers).toFixed(1)),
        totalIncidents: parseFloat(calculateTrend(
          pendingEmergencies + inProgressEmergencies + resolvedEmergencies, 
          prevEmergencies
        ).toFixed(1)),
        activeOfficers: parseFloat(calculateTrend(activeOfficers, prevOfficers).toFixed(1)),
        newMessages: parseFloat(calculateTrend(totalMessages, prevMessages).toFixed(1))
      };

      // Get recent activity from emergencies, messages, and FIRs
      const recentEmergencies = await Emergency.find()
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const recentMessages = await Message.find()
        .populate('sender', 'name')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      const recentFIRs = await FIR.find()
        .sort({ filedAt: -1 })
        .limit(2)
        .lean();

      // Format activity data
      const formattedActivity = [
        ...recentEmergencies.map(emergency => ({
          type: 'incident',
          message: `New ${emergency.type} reported at ${emergency.location}`,
          timestamp: emergency.createdAt,
          emergencyId: emergency._id
        })),
        ...recentMessages.map(msg => ({
          type: 'message',
          message: `New message from ${msg.sender?.name || 'Unknown'}`,
          timestamp: msg.createdAt,
          messageId: msg._id
        })),
        ...recentFIRs.map(fir => ({
          type: 'fir',
          message: `FIR filed by ${fir.complainantName}`,
          timestamp: fir.filedAt,
          firId: fir._id
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
       .slice(0, 5); // Show only 5 most recent activities

      res.json({
        success: true,
        data: {
          overview: {
            activeUsers,
            totalIncidents: pendingEmergencies + inProgressEmergencies + resolvedEmergencies,
            activeOfficers,
            newMessages: totalMessages,
            unreadNotifications,
            trends
          },
          detailedStats: {
            emergencies: {
              pending: pendingEmergencies,
              inProgress: inProgressEmergencies,
              resolved: resolvedEmergencies,
              total: pendingEmergencies + inProgressEmergencies + resolvedEmergencies
            },
            firs: {
              filed: filedFIRs,
              underInvestigation: underInvestigationFIRs,
              closed: closedFIRs,
              total: filedFIRs + underInvestigationFIRs + closedFIRs
            },
            officers: {
              onDuty: activeOfficers,
              offDuty: offDutyOfficers,
              total: activeOfficers + offDutyOfficers
            },
            reports: {
              pending: pendingReports,
              inProgress: inProgressReports,
              resolved: resolvedReports,
              total: pendingReports + inProgressReports + resolvedReports
            }
          },
          activity: formattedActivity
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load dashboard data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  getUserActivity: async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get recent activity from multiple sources
      const [emergencies, messages, firs, userActivity] = await Promise.all([
        Emergency.find({ createdAt: { $gte: startDate } })
          .populate('reportedBy', 'name')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        Message.find({ createdAt: { $gte: startDate } })
          .populate('sender', 'name')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        FIR.find({ filedAt: { $gte: startDate } })
          .sort({ filedAt: -1 })
          .limit(10)
          .lean(),
        User.aggregate([
          {
            $match: {
              lastSeen: { $gte: startDate },
              isActive: true
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$lastSeen' } },
                department: '$department'
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.date': 1 }
          }
        ])
      ]);

      // Format activity data
      const activity = [
        ...emergencies.map(emergency => ({
          type: 'incident',
          message: `${emergency.type} incident reported at ${emergency.location}`,
          timestamp: emergency.createdAt,
          emergencyId: emergency._id
        })),
        ...messages.map(msg => ({
          type: 'message',
          message: `New message from ${msg.sender?.name || 'Unknown'}`,
          timestamp: msg.createdAt,
          messageId: msg._id
        })),
        ...firs.map(fir => ({
          type: 'fir',
          message: `FIR filed by ${fir.complainantName}`,
          timestamp: fir.filedAt,
          firId: fir._id
        }))
      ];

      // Sort by timestamp (newest first) and limit to 15 items
      activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentActivity = activity.slice(0, 15);

      res.json({
        success: true,
        data: {
          activity: recentActivity,
          userActivity: userActivity
        }
      });
    } catch (error) {
      console.error('User activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity'
      });
    }
  },

  getChartsData: async (req, res) => {
    try {
      const { period = 'week' } = req.query;
      let startDate = new Date();

      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get incidents data for the selected period
      const incidentsData = await Emergency.aggregate([
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

      // Get incidents by type
      const incidentsByType = await Emergency.aggregate([
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

      // Format data for charts
      const overviewData = {
        labels: incidentsData.map(item => {
          const date = new Date(item._id.date);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        }),
        data: incidentsData.map(item => item.count)
      };

      const typesData = {
        labels: incidentsByType.map(item => item._id.charAt(0).toUpperCase() + item._id.slice(1)),
        data: incidentsByType.map(item => item.count)
      };

      res.json({
        success: true,
        data: {
          overview: overviewData,
          types: typesData
        }
      });
    } catch (error) {
      console.error('Charts data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch charts data'
      });
    }
  }
};

module.exports = dashboardController;