// Backend/routes/emergencyRoutes.js
const express = require('express');
const router = express.Router();

// Try to load a model if your project has one
// (adjust the require below to match your actual file name if needed)
let Emergency = null;
try {
  Emergency = require('../models/Emergency');
} catch {
  // no model found; we'll still respond safely
  console.warn('[emergencyRoutes] models/Emergency.js not found; responding with empty data.');
}

// simple ping so you can verify this router is mounted
router.get('/ping', (req, res) => res.json({ ok: true, where: '/api/emergency/ping' }));

// GET /api/emergency  — list with optional pagination & search
router.get('/', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || '').trim();

    if (!Emergency || !Emergency.find) {
      return res.json({
        success: true,
        data: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 0 }
      });
    }

    const query = search
      ? {
          $or: [
            { type: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } },
          ]
        }
      : {};

    const docs = await Emergency.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Emergency.countDocuments(query);

    res.json({
      success: true,
      data: docs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (err) { next(err); }
});

// GET /api/emergency/:id — fetch one
router.get('/:id', async (req, res, next) => {
  try {
    if (!Emergency || !Emergency.findById) {
      return res.status(404).json({ success: false, message: 'Emergency model not available' });
    }
    const doc = await Emergency.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Emergency not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// (OPTIONAL) POST/PUT/DELETE can be added later with auth middleware if needed
module.exports = router;