const express = require('express');
const router = express.Router();
const Police = require('../models/Police');
// const auth = require('../middlewares/auth'); // enable if you want to protect this route

// Simple field validation
function requireStr(v, msg) {
  if (!v || !String(v).trim()) throw new Error(msg);
}

// POST /api/officers  (Create new officer)
router.post('/', /*auth,*/ async (req, res, next) => {
  try {
    const {
      name, email, phone, badgeId, rank, department,
      status, assignedCases, policeStation, password
    } = req.body || {};

    // Validate required fields
    requireStr(name, 'name is required');
    requireStr(email, 'email is required');

    // Check uniqueness
    const exists = await Police.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (exists) return res.status(409).json({ success: false, message: 'Email already exists' });

    // Use provided password or generate a temporary one
    const tempPwd = password && String(password).trim().length >= 6
      ? String(password).trim()
      : 'Passw0rd!'; // you can randomize if you like

    const doc = await Police.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: phone ? String(phone).trim() : undefined,
      badgeId: badgeId ? String(badgeId).trim() : undefined,
      rank: rank ? String(rank).trim() : undefined,
      department: department ? String(department).trim() : undefined,
      status: status || 'Active',
      assignedCases: Number.isFinite(+assignedCases) ? +assignedCases : 0,
      policeStation: policeStation ? String(policeStation).trim() : undefined,
      password: tempPwd
    });

    // return created (without password)
    const { password: _, ...safe } = doc.toObject();
    return res.status(201).json({ success: true, data: safe, tempPasswordUsed: !password });
  } catch (err) {
    if (err.message?.includes('required')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

module.exports = router;