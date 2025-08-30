const express = require('express');
const router = express.Router();
const auth  = require('../middlewares/auth');
const Police = require('../models/Police');

router.get('/',auth, async (req, res, next) => {
  try{
    const officer = await Police.findById(req.user.id).select('-password');
    if (!officer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Officer not found' 
      });
    }
    res.json({ success: true, data: officer });
  }catch(err){
    next(err);
  }
});

module.exports = router;