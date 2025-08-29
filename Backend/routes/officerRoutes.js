// routes/officerRoutes.js
const express = require('express');
const router = express.Router();
const Police = require('../models/Police');

// Simple field validation
function requireStr(v, msg) {
  if (!v || !String(v).trim()) throw new Error(msg);
}

// GET /api/officers - Get all officers
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { badgeId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const officers = await Police.find(query).select('-password');
    res.status(200).json(officers);
  } catch (err) {
    next(err);
  }
});

// GET /api/officers/:id - Get officer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const officer = await Police.findById(req.params.id).select('-password');
    
    if (!officer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    
    res.status(200).json(officer);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    next(err);
  }
});

// POST /api/officers - Create new officer
router.post('/', async (req, res, next) => {
  try {
    const {
      name, email, phone, badgeId, rank, department,
      status, assignedCases, policeStation, password
    } = req.body || {};

    // Validate required fields
    requireStr(name, 'name is required');
    requireStr(email, 'email is required');
    requireStr(password, 'password is required');

    // Check uniqueness
    const exists = await Police.findOne({ 
      $or: [
        { email: String(email).toLowerCase().trim() },
        { badgeId: badgeId ? String(badgeId).trim() : undefined }
      ]
    }).lean();
    
    if (exists) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email or Badge ID already exists' 
      });
    }

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
      password: String(password).trim()
    });

    // Return created officer without password
    const { password: _, ...safeOfficer } = doc.toObject();
    res.status(201).json({ 
      success: true, 
      data: safeOfficer 
    });
  } catch (err) {
    if (err.message?.includes('required')) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    next(err);
  }
});

// PUT /api/officers/:id - Update officer
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name, email, phone, badgeId, rank, department,
      status, assignedCases, policeStation
    } = req.body || {};

    // Validate required fields
    requireStr(name, 'name is required');
    requireStr(email, 'email is required');

    // Check if another officer has the same email or badgeId
    const existingOfficer = await Police.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { email: String(email).toLowerCase().trim() },
        { badgeId: badgeId ? String(badgeId).trim() : undefined }
      ]
    }).lean();
    
    if (existingOfficer) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email or Badge ID already exists' 
      });
    }

    const updatedOfficer = await Police.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        phone: phone ? String(phone).trim() : undefined,
        badgeId: badgeId ? String(badgeId).trim() : undefined,
        rank: rank ? String(rank).trim() : undefined,
        department: department ? String(department).trim() : undefined,
        status: status || 'Active',
        assignedCases: Number.isFinite(+assignedCases) ? +assignedCases : 0,
        policeStation: policeStation ? String(policeStation).trim() : undefined
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedOfficer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: updatedOfficer 
    });
  } catch (err) {
    if (err.message?.includes('required')) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    if (err.name === 'CastError') {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    next(err);
  }
});

// DELETE /api/officers/:id - Delete officer
router.delete('/:id', async (req, res, next) => {
  try {
    const officer = await Police.findByIdAndDelete(req.params.id);
    
    if (!officer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Officer deleted successfully' 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    next(err);
  }
});

module.exports = router;