const express = require('express');
const router = express.Router();
const Police = require('../models/Police');

// ---------------- HELPER ---------------- //
function requireStr(v, msg) {
  if (!v || !String(v).trim()) throw new Error(msg);
}

// ---------------- CHAT-SPECIFIC ROUTES ---------------- //

// Get all officers for chat (excluding self)
router.get('/chat', async (req, res) => {
  try {
    const excludeUid = req.query.exclude;
    if (!excludeUid) return res.status(400).json({ success: false, message: "Exclude UID missing" });

    const officers = await Police.find({ firebaseUid: { $ne: excludeUid } })
      .select('firebaseUid name profilePic email rank department');

    if (!officers || officers.length === 0) {
      return res.status(404).json({ success: false, message: "Officer not found" });
    }

    res.json({ success: true, users: officers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get officer by Firebase UID (for chat)
router.get('/chat/:firebaseUid', async (req, res) => {
  try {
    const user = await Police.findOne({ firebaseUid: req.params.firebaseUid })
      .select('firebaseUid name profilePic email rank department');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- EXISTING CRUD ROUTES ---------------- //

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
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    
    res.status(200).json(officer);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    next(err);
  }
});

// POST /api/officers - Create new officer
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, name, profilePic } = req.body;
    if (!firebaseUid || !name) {
      return res.status(400).json({ success: false, message: "firebaseUid and name are required" });
    }

    let user = await Police.findOne({ firebaseUid });
    if (user) return res.json({ success: true, user });

    user = await Police.create({ firebaseUid, name, profilePic });

    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/officers/:id - Update officer
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name, email, phone, badgeId, officerId, rank, department,
      status, assignedCases, policeStation
    } = req.body || {};

    requireStr(name, 'name is required');
    requireStr(email, 'email is required');
    requireStr(officerId, 'officerId is required');

    const existingOfficer = await Police.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { email: String(email).toLowerCase().trim() },
        { officerId: officerId ? String(officerId).trim() : undefined }
      ]
    }).lean();
    
    if (existingOfficer) {
      return res.status(409).json({ success: false, message: 'Email or officer ID already exists' });
    }

    const updatedOfficer = await Police.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        phone: phone ? String(phone).trim() : undefined,
        badgeId: badgeId ? String(badgeId).trim() : undefined,
        officerId: String(officerId).trim(),
        rank: rank ? String(rank).trim() : undefined,
        department: department ? String(department).trim() : undefined,
        status: status || 'Active',
        assignedCases: Number.isFinite(+assignedCases) ? +assignedCases : 0,
        policeStation: policeStation ? String(policeStation).trim() : undefined
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedOfficer) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    res.status(200).json({ success: true, data: updatedOfficer });
  } catch (err) {
    if (err.message?.includes('required')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    next(err);
  }
});

// DELETE /api/officers/:id - Delete officer
router.delete('/:id', async (req, res, next) => {
  try {
    const officer = await Police.findByIdAndDelete(req.params.id);
    
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    
    res.status(200).json({ success: true, message: 'Officer deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    next(err);
  }
});

// Get officer profile by Mongo ID
router.get('/profile/:mongoId', async (req, res) => {
  try {
    const user = await Police.findById(req.params.mongoId)
      .select('firebaseUid name profilePic email rank department');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        profilePic: user.profilePic,
        email: user.email,
        rank: user.rank,
        department: user.department
      }
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update officer profile by Firebase UID
router.put('/profile/:firebaseUid', async (req, res) => {
  try {
    const updates = req.body;
    const user = await Police.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Assign firebaseUid automatically after login
router.post('/assign-firebase-uid', async (req, res) => {
  try {
    const { email, firebaseUid, name, profilePic } = req.body;
    if (!email || !firebaseUid) {
      return res.status(400).json({ success: false, message: "Email and Firebase UID required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ update instead of creating
    const updatedOfficer = await Police.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          firebaseUid,
          ...(name && { name }),
          ...(profilePic && { profilePic })
        }
      },
      { new: true, upsert: false, runValidators: false } // no creation, no password check
    ).select('-password');

    if (!updatedOfficer) {
      return res.status(404).json({ success: false, message: "Officer not found. Please register officer first." });
    }

    res.json({ success: true, user: updatedOfficer });
  } catch (err) {
    console.error("Error in /assign-firebase-uid:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
