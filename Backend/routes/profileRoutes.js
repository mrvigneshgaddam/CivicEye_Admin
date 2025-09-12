// Backend/routes/profile.js (or wherever your profile route is)
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Police = require('../models/Police');

// Get profile data
router.get('/', auth, async (req, res, next) => {
  try {
    const officer = await Police.findById(req.user.id).select('-password');
    if (!officer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    res.json({ success: true, data: officer });
  } catch (err) {
    next(err);
  }
});

// Update profile data
router.post('/update', auth, async (req, res, next) => {
  try {
    const { name, email, phone, rank, department, badgeId, policeStation } = req.body;
    
    const updatedOfficer = await Police.findByIdAndUpdate(
      req.user.id,
      { name, email, phone, rank, department, badgeId, policeStation },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedOfficer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    
    res.json({ success: true, data: updatedOfficer, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;