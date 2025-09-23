// Backend/routes/firRoutes.js
const express = require('express');
const router = express.Router();

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

/* GET /api/fir  — list with pagination & optional search/status */
router.get('/', async (req, res) => {
  // If no model is available, return an empty list so the route still works
  if (!ReportModel) return res.json({ success: true, data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 0 } });

  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const query = {};
    if (search) {
      query.$or = [
        { firId: { $regex: search, $options: 'i' } },
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

/* GET /api/fir/stats */
router.get('/stats', async (req, res) => {
  if (!ReportModel) return res.json({ success: true, data: { total: 0, pending: 0, resolved: 0, urgent: 0 } });
  try {
    const total    = await ReportModel.countDocuments();
    const pending  = await ReportModel.countDocuments({ status: 'Pending' });
    const resolved = await ReportModel.countDocuments({ status: 'Resolved' });
    const urgent   = await ReportModel.countDocuments({ status: 'Urgent' });
    return res.json({ success: true, data: { total, pending, resolved, urgent } });
  } catch (err) {
    console.error('[FIR ROUTES] /stats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* GET /api/fir/:id */
router.get('/:id', async (req, res) => {
  if (!ReportModel) return res.status(404).json({ success: false, message: 'Model not available' });
  try {
    const report = await ReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'FIR not found' });
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('[FIR ROUTES] /:id error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
/* PUT /api/fir/:id/assign — assign officer manually */
router.put('/:id/assign', async (req, res) => {
  if (!ReportModel) return res.status(404).json({ success: false, message: 'Model not available' });
  const { officerId } = req.body || {};
  if (!officerId) return res.status(400).json({ success: false, message: 'officerId required' });
  try {
    const officer = await Police.findOne({ officerId }).exec();
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    const report = await ReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'FIR not found' });

    const reportIdentifier = report.reportId;
    // If report was previously assigned to another officer, remove from that officer's list
    if (report.assignedOfficerId && report.assignedOfficerId !== officer.officerId) {
      await Police.updateOne(
        { officerId: report.assignedOfficerId },
        { $pull: { assignedReports: reportIdentifier }, $inc: { assignedCases: -1 } }
      );
    }

    report.assignedOfficer = officer.name;
    report.assignedOfficerId = officer.officerId;
    report.status = 'Officer Assigned';
    await report.save();

    // Add report to new officer's list
    if (!Array.isArray(officer.assignedReports)) officer.assignedReports = [];
    if (!officer.assignedReports.includes(reportIdentifier)) {
      officer.assignedReports.push(reportIdentifier);
    }
    officer.assignedCases = officer.assignedReports.length;
    await officer.save();

    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('[FIR ROUTES] PUT /:id/assign error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
/* DELETE /api/fir/:id */
router.delete('/:id', async (req, res) => {
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


