// Backend/routes/officerRoutes.js
const express = require('express');
const router = express.Router();
const Police = require('../models/Police');
const auth = require('../middlewares/auth');

// GET /api/officers?search=&page=&limit=
router.get('/', auth, async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || '').trim();

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { badgeId: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const docs = await Police.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Police.countDocuments(query);

    res.json({
      success: true,
      data: docs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/officers/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const doc = await Police.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// PUT /api/officers/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const allowed = ['name','badgeId','rank','department','phone','status','email'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];

    const doc = await Police.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// DELETE /api/officers/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const doc = await Police.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, message: 'Officer deleted' });
  } catch (err) { next(err); }
});

module.exports = router;