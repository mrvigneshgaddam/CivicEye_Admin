// Backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();

// Try to load models if they exist; if not, we’ll still return safe zeros
let Report = null;
let Police = null;
try { Report = require('../models/Report'); } catch {}
try { Police = require('../models/Police'); } catch {}

// Health/ping to confirm router is mounted
router.get('/ping', (req, res) => res.json({ ok: true, where: '/api/dashboard/ping' }));

// Simple summary for the dashboard top cards (safe even if models missing)
router.get('/', async (req, res, next) => {
  try {
    const nowIso = new Date().toISOString();

    // Default zeros if models not available
    let totalReports = 0;
    let totalOfficers = 0;

    if (Report && Report.countDocuments) {
      totalReports = await Report.countDocuments({});
    }
    if (Police && Police.countDocuments) {
      totalOfficers = await Police.countDocuments({});
    }

    return res.json({
      success: true,
      data: {
        serverTime: nowIso,
        totals: {
          reports: totalReports,
          officers: totalOfficers
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// More detailed stats endpoint (safe fallbacks)
router.get('/stats', async (req, res, next) => {
  try {
    const stats = {
      reports: {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        urgent: 0,
      },
      officers: {
        total: 0,
        active: 0,
        onLeave: 0,
        inactive: 0,
      },
    };

    if (Report && Report.countDocuments) {
      stats.reports.total      = await Report.countDocuments({});
      stats.reports.pending    = await Report.countDocuments({ status: 'Pending' });
      stats.reports.inProgress = await Report.countDocuments({ status: 'In Progress' });
      stats.reports.resolved   = await Report.countDocuments({ status: 'Resolved' });
      stats.reports.urgent     = await Report.countDocuments({ status: 'Urgent' });
    }

    if (Police && Police.countDocuments) {
      stats.officers.total    = await Police.countDocuments({});
      stats.officers.active   = await Police.countDocuments({ status: 'Active' });
      stats.officers.onLeave  = await Police.countDocuments({ status: 'On Leave' });
      stats.officers.inactive = await Police.countDocuments({ status: 'Inactive' });
    }

    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;