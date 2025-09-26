// Backend/routes/officerRoutes.js

const express = require('express');
const router = express.Router();
const Police = require('../models/Police');
const auth = require('../middlewares/auth');
const admin = require('../config/firebase');
const jwt = require('jsonwebtoken');

// ---------------- HELPER ---------------- //
function requireStr(v, msg) {
  if (!v || !String(v).trim()) throw new Error(msg);
}

// ---------------- AUTH MIDDLEWARES ---------------- //

// Firebase authentication middleware
const firebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No Firebase token provided' });
    }

    const firebaseToken = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
  }
};

// Combined auth middleware that tries JWT first, then Firebase
const combinedAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenFromCookie = req.cookies?.token;

  // Try JWT auth first
  if ((authHeader && authHeader.startsWith('Bearer ')) || tokenFromCookie) {
    try {
      let token = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (tokenFromCookie) {
        token = tokenFromCookie;
      }

      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await Police.findById(decoded.id).select('-password');
      if (!user) throw new Error('User not found');

      if (user.status !== 'Active') throw new Error('Account not active');

      req.user = user;
      req.policeId = user._id.toString();
      return next();
    } catch (jwtError) {
      console.log('JWT auth failed, trying Firebase...');
    }
  }

  // Try Firebase auth
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authentication token provided' });
    }

    const firebaseToken = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

    const user = await Police.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    req.user = user;
    req.policeId = user._id.toString();
    next();
  } catch (firebaseError) {
    console.error('Firebase auth failed:', firebaseError);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

// ---------------- CHAT-SPECIFIC ROUTES ---------------- //

// Get all officers for chat (excluding self)
router.get('/chat', combinedAuth, async (req, res) => {
  try {
    const currentUser = req.user;

    const officers = await Police.find({
      _id: { $ne: currentUser._id },
      firebaseUid: { $exists: true, $ne: null }
    })
      .select('name email profilePic firebaseUid department rank')
      .lean();

    res.json({
      success: true,
      users: officers
    });
  } catch (error) {
    console.error('Error fetching officers for chat:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching officers'
    });
  }
});

// Get officer by Firebase UID (for chat)
router.get('/chat/:firebaseUid', combinedAuth, async (req, res) => {
  try {
    const firebaseUid = req.params.firebaseUid;
    console.log('🔍 Fetching officer by Firebase UID:', firebaseUid);
    
    const officer = await Police.findOne({ 
      firebaseUid: firebaseUid 
    })
    .select('name email profilePic firebaseUid department rank _id')
    .lean();

    console.log('✅ Officer search result:', officer);

    if (!officer) {
      console.log('❌ Officer not found for Firebase UID:', firebaseUid);
      
      // Try to find if this UID exists in any conversation and needs cleanup
      const conversationsRef = admin.firestore().collection('conversations');
      const conversations = await conversationsRef
        .where('participants', 'array-contains', firebaseUid)
        .get();

      if (!conversations.empty) {
        console.log(`⚠️ Firebase UID ${firebaseUid} exists in ${conversations.size} conversations but not in MongoDB`);
      }

      return res.status(200).json({
        success: true,
        user: null,
        message: 'User not found in database'
      });
    }

    res.json({
      success: true,
      user: officer
    });
  } catch (error) {
    console.error('❌ Error fetching officer by Firebase UID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile'
    });
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

    let officer = await Police.findOne({ email });

    if (!officer) {
      officer = new Police({
        name: name || `Officer-${firebaseUid.substring(0, 8)}`,
        email,
        password: 'temp-password-123',
        firebaseUid,
        profilePic: profilePic || ''
      });
    } else {
      officer.firebaseUid = firebaseUid;
      if (name) officer.name = name;
      if (profilePic) officer.profilePic = profilePic;
    }

    await officer.save();

    const officerData = officer.toObject();
    delete officerData.password;

    res.json({
      success: true,
      user: officerData
    });
  } catch (error) {
    console.error('Error assigning Firebase UID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get officer by session user info
router.get('/session-user', auth, async (req, res) => {
  try {
    const officer = await Police.findById(req.user.id);
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found"
      });
    }

    res.json({
      success: true,
      user: officer
    });
  } catch (error) {
    console.error("Error fetching session user:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;
