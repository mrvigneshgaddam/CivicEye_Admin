const Report = require('../models/Report');

async function getNotifications(req, res) {
    try {
        const userId = req.policeId; // coming from auth middleware

        // You can filter reports for this specific officer or user if needed
        const reports = await Report.find()
            .sort({ reportedAt: -1 })
            .limit(5)
            .lean();

        const notifications = reports.map(report => ({
            id: report._id,
            type: 'incident',
            icon: 'fa-exclamation-triangle',
            message: report.incidentType ? `${report.incidentType} reported at ${report.location}` : 'New incident reported',
            timestamp: report.reportedAt || report.createdAt,
            read: false
        }));

        return res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('[Notifications] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}

module.exports = { getNotifications };
