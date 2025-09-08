// Backend/routes/firRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

/* Try to use whichever model you actually have */
let ReportModel = null;
try {
  ReportModel = require('../models/Report');       // if exists
} catch (e) {
  try {
    ReportModel = require('../models/firModel');   // fallback if your model is named differently
  } catch (e2) {
    console.warn('[FIR ROUTES] No Report model found (models/Report.js or models/firModel.js). Using in-memory fallback.');
  }
}

const Police = require('../models/Police'); // for officer assignment

/* Quick ping to prove the router is mounted */
router.get('/ping', (req, res) => res.json({ ok: true, where: '/api/fir/ping' }));

/* GET /api/fir  — list with pagination, optional search/status, and officer filtering */
router.get('/', auth, async (req, res) => {
  if (!ReportModel) return res.json({ success: true, data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 0 } });

  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const query = {};

    // Officers only see their assigned FIRs; admins see all
    if (!req.police?.isAdmin) {
      query.assignedOfficerId = req.police.officerId;
    }

    // Apply search
    if (search) {
      query.$or = [
        { reportId: { $regex: search, $options: 'i' } },
        { 'complainant.name': { $regex: search, $options: 'i' } },
        { incidentType: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;

    const docs = await ReportModel.find(query)
      .sort({ reportedAt: -1, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const totalItems = await ReportModel.countDocuments(query);

    return res.json({
      success: true,
      data: docs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error('[FIR ROUTES] GET / error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* GET /api/fir/stats — optionally filtered by officer */
router.get('/stats', auth, async (req, res) => {
  if (!ReportModel) return res.json({ success: true, data: { total: 0, pending: 0, resolved: 0, urgent: 0 } });

  try {
    const filter = {};
    if (!req.police?.isAdmin) {
      filter.assignedOfficerId = req.police.officerId;
    }

    const total    = await ReportModel.countDocuments(filter);
    const pending  = await ReportModel.countDocuments({ ...filter, status: 'Pending' });
    const resolved = await ReportModel.countDocuments({ ...filter, status: 'Resolved' });
    const urgent   = await ReportModel.countDocuments({ ...filter, status: 'Urgent' });

    return res.json({ success: true, data: { total, pending, resolved, urgent } });
  } catch (err) {
    console.error('[FIR ROUTES] /stats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* GET /api/fir/:id */
router.get('/:id', auth, async (req, res) => {
  if (!ReportModel) return res.status(404).json({ success: false, message: 'Model not available' });

  try {
    const report = await ReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'FIR not found' });

    // Officer can only access their own FIR
    if (!req.police?.isAdmin && report.assignedOfficerId !== req.police.officerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('[FIR ROUTES] /:id error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* PUT /api/fir/:id/assign — assign officer manually */
router.put('/:id/assign', auth, async (req, res) => {
  if (!ReportModel) return res.status(404).json({ success: false, message: 'Model not available' });
  const { officerId } = req.body || {};
  if (!officerId) return res.status(400).json({ success: false, message: 'officerId required' });

  try {
    const officer = await Police.findOne({ officerId }).exec();
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    const report = await ReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'FIR not found' });

    const reportIdentifier = report.reportId;

    // Remove from previous officer if reassigned
    if (report.assignedOfficerId && report.assignedOfficerId !== officer.officerId) {
      await Police.updateOne(
        { officerId: report.assignedOfficerId },
        { $pull: { assignedReports: reportIdentifier }, $inc: { assignedCases: -1 } }
      );
    }

    report.assignedOfficer = officer.name;
    report.assignedOfficerId = officer.officerId;
    await report.save();

    // Add report to new officer's list
    if (!Array.isArray(officer.assignedReports)) officer.assignedReports = [];
    if (!officer.assignedReports.includes(reportIdentifier)) officer.assignedReports.push(reportIdentifier);
    officer.assignedCases = officer.assignedReports.length;
    await officer.save();

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('[FIR ROUTES] PUT /:id/assign error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE /api/fir/:id */
router.delete('/:id', auth, async (req, res) => {
  if (!ReportModel) return res.status(404).json({ success: false, message: 'Model not available' });

  try {
    const removed = await ReportModel.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'FIR not found' });
    return res.json({ success: true, message: 'FIR deleted successfully' });
  } catch (err) {
    console.error('[FIR ROUTES] DELETE /:id error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
