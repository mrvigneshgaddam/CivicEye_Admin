const Emergency = require('../models/Emergency');
const Police = require('../models/Police');
const Notification = require('../models/Notification');

const quickActionsController = {
  assignOfficer: async (req, res) => {
    try {
      const { incidentId, officerId } = req.body;
      
      // Validate input
      if (!incidentId || !officerId) {
        return res.status(400).json({
          success: false,
          message: 'Incident ID and Officer ID are required'
        });
      }

      // Update emergency with assigned officer
      const emergency = await Emergency.findByIdAndUpdate(
        incidentId,
        { 
          assignedOfficer: officerId,
          status: 'in-progress'
        },
        { new: true }
      ).populate('assignedOfficer', 'name rank');

      if (!emergency) {
        return res.status(404).json({
          success: false,
          message: 'Emergency not found'
        });
      }

      // Create notification
      await Notification.createNotification({
        userId: req.user._id,
        title: 'Officer Assigned',
        message: `Officer ${emergency.assignedOfficer.name} assigned to emergency`,
        type: 'success',
        relatedTo: incidentId,
        relatedModel: 'Emergency'
      });

      res.json({
        success: true,
        message: 'Officer assigned successfully',
        data: emergency
      });

    } catch (error) {
      console.error('Assign officer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign officer'
      });
    }
  },

  dispatchTeam: async (req, res) => {
    try {
      const { location, emergencyType, description } = req.body;
      
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location is required'
        });
      }

      // Create new emergency
      const emergency = await Emergency.create({
        type: emergencyType || 'other',
        location,
        description: description || 'Team dispatched to location',
        status: 'in-progress',
        reportedBy: req.user._id
      });

      // Create notification
      await Notification.createNotification({
        userId: req.user._id,
        title: 'Team Dispatched',
        message: `Team dispatched to ${location}`,
        type: 'alert',
        relatedTo: emergency._id,
        relatedModel: 'Emergency'
      });

      res.json({
        success: true,
        message: 'Team dispatched successfully',
        data: emergency
      });

    } catch (error) {
      console.error('Dispatch team error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dispatch team'
      });
    }
  },

  createAlert: async (req, res) => {
    try {
      const { message, priority = 'high', targetDepartment } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Alert message is required'
        });
      }

      // Create notification for all users or specific department
      const notificationData = {
        title: 'System Alert',
        message,
        type: 'alert',
        priority
      };

      if (targetDepartment) {
        // Get users from specific department
        const users = await User.find({ department: targetDepartment });
        const notifications = users.map(user => ({
          ...notificationData,
          userId: user._id
        }));
        
        await Notification.insertMany(notifications);
      } else {
        // Send to all users
        notificationData.userId = req.user._id;
        await Notification.createNotification(notificationData);
      }

      res.json({
        success: true,
        message: 'Alert created successfully'
      });

    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create alert'
      });
    }
  }
};

module.exports = quickActionsController;