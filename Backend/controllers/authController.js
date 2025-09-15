// Backend/controllers/authController.js
const Police = require('../models/Police');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendAdminEmail } = require('../utils/sendAdminEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 24*60*60*1000, path: '/' };
}

exports.login = async (req, res) => {
  const rawEmail = (req.body?.email || '').trim();
  const email = rawEmail.toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  // DEBUG (temporarily):
  // console.log('[login] body:', req.body);

  // Because password has select:false
  const user = await Police.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.cookie('token', token, cookieOpts());
  
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
  };
  res.json({ success: true, token, user: userData });
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { ...cookieOpts(), maxAge: 0 });
  res.json({ success: true });
};

// Update just the 'me' function in your authController.js
exports.me = async (req, res) => {
  const u = await Police.findById(req.user.id).lean();
  if (!u) return res.status(404).json({ success: false, message: 'Not found' });
  delete u.password;
  // Changed from 'user' to 'data' to match your profile route expectation
  res.json({ success: true, data: u });
};
exports.verify = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    let token = null;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
  },

  // ✅ Unlock account (admin)
  unlockAccount: async (req, res) => {
    try {
      const { policeId } = req.body;
      const currentPolice = await Police.findById(req.policeId);
      if (!currentPolice.isAdmin) return res.status(403).json({ error: 'Admin access required' });

      const settings = await Settings.findOne({ policeId });
      if (!settings) return res.status(404).json({ error: 'Settings not found' });

      settings.security.failedLoginAttempts = 0;
      settings.security.lockedUntil = null;
      await settings.save();

      res.json({ success: true, message: 'Account unlocked successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ✅ Check lock status
  checkAccountLock: async (req, res) => {
    try {
      const { policeId } = req.params;
      const settings = await Settings.findOne({ policeId });
      if (!settings) return res.json({ locked: false });

      const isLocked = settings.security.lockedUntil && settings.security.lockedUntil > new Date();
      res.json({
        locked: isLocked,
        lockedUntil: settings.security.lockedUntil,
        attempts: settings.security.failedLoginAttempts
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;
