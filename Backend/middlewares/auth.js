// Backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const Police = require('../models/Police');   // Police model
const Settings = require('../models/Settings'); // Settings model (for security/lock checks)

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    // Extract token from header
    let token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token && req.cookies?.token) {
      token = req.cookies.token; // fallback to cookies
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find police officer by decoded.policeId
    const police = await Police.findById(decoded.policeId).select('-password');
    if (!police) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. Police officer not found.'
      });
    }

    // Check if account is active
    if (police.status && police.status.toLowerCase() !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if account is locked in Settings
    const settings = await Settings.findOne({ policeId: police._id });
    if (settings && settings.security?.lockedUntil && settings.security.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Account locked due to multiple failed login attempts',
        lockedUntil: settings.security.lockedUntil
      });
    }

    // Attach police details to request
    req.policeId = police._id;
    req.police = police;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.police?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in admin verification.'
    });
  }
};

module.exports = { auth, requireAdmin };
