// Backend/controllers/authController.js
const Police = require('../models/Police');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendAdminEmail } = require('../utils/sendAdminEmail');

const authController = {
  // ✅ Register new police officer
  registerMongo: async (req, res) => {
    try {
      const { name, email, password, officerId, department, badgeId, phone, policeStation, rank } = req.body;

      if (!name || !email || !password || !officerId || !badgeId) {
        return res.status(400).json({ success: false, message: 'Name, email, officerId, badgeId and password are required' });
      }

      const existingPolice = await Police.findOne({
        $or: [
          { email: email.toLowerCase() },
          { officerId },
          { badgeId }
        ]
      });

      if (existingPolice) {
        let message = 'Police officer already exists';
        if (existingPolice.email === email.toLowerCase()) message = 'Email already in use';
        if (existingPolice.officerId === officerId) message = 'Officer ID already taken';
        if (existingPolice.badgeId === badgeId) message = 'Badge ID already exists';
        return res.status(400).json({ success: false, message });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const police = new Police({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        officerId,
        department,
        badgeId,
        phone,
        policeStation,
        rank,
        isActive: true, // boolean
        isAdmin: req.body.isAdmin || false
      });

      await police.save();

      try {
        const settings = new Settings({ policeId: police._id });
        await settings.save();
      } catch (error) {
        console.error('Error creating settings:', error);
      }

      const token = jwt.sign({ policeId: police._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.status(201).json({
        success: true,
        message: 'Police officer registered successfully',
        token,
        police: {
          id: police._id,
          name: police.name,
          email: police.email,
          officerId: police.officerId,
          department: police.department,
          badgeId: police.badgeId,
          isAdmin: police.isAdmin,
          policeStation: police.policeStation,
          rank: police.rank
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
  },

  // ✅ Login
  loginMongo: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

      // select password explicitly
      const police = await Police.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
      if (!police) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      let settings = await Settings.findOne({ policeId: police._id });
      if (!settings) {
        settings = new Settings({ policeId: police._id });
        await settings.save();
      }

      // ensure security object exists
      if (!settings.security) {
        settings.security = { failedLoginAttempts: 0, loginAttempts: 5, lockedUntil: null };
      }

      if (settings.security.lockedUntil && settings.security.lockedUntil > new Date()) {
        return res.status(423).json({
          success: false,
          message: `Account locked. Try after ${settings.security.lockedUntil.toLocaleString()}`,
          lockedUntil: settings.security.lockedUntil
        });
      }

      const isMatch = await bcrypt.compare(password, police.password);
      if (!isMatch) {
        settings.security.failedLoginAttempts = (settings.security.failedLoginAttempts || 0) + 1;
        const maxAttempts = settings.security.loginAttempts || 5;

        if (settings.security.failedLoginAttempts >= maxAttempts) {
          settings.security.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          try { await sendAdminEmail(police); } catch (e) { console.error('Failed to send email:', e); }
          await settings.save();
          return res.status(423).json({
            success: false,
            message: `Account locked due to ${maxAttempts} failed login attempts.`,
            lockedUntil: settings.security.lockedUntil
          });
        }

        await settings.save();
        return res.status(401).json({
          success: false,
          message: `Invalid email or password. ${maxAttempts - settings.security.failedLoginAttempts} attempts remaining.`
        });
      }

      // Reset failed attempts
      settings.security.failedLoginAttempts = 0;
      settings.security.lockedUntil = null;
      settings.security.lastLogin = new Date();
      await settings.save();

      police.lastSeen = new Date();
      await police.save();

      const token = jwt.sign({ policeId: police._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        police: {
          id: police._id,
          name: police.name,
          email: police.email,
          officerId: police.officerId,
          department: police.department,
          badgeId: police.badgeId,
          isAdmin: police.isAdmin,
          policeStation: police.policeStation,
          rank: police.rank
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Login failed', error: err.message });
    }
  },

  // ✅ Get current user
  getCurrentUserMongo: async (req, res) => {
    try {
      const police = await Police.findById(req.policeId);
      if (!police) return res.status(404).json({ success: false, message: 'Police officer not found' });

      res.json({
        success: true,
        police: {
          id: police._id,
          name: police.name,
          email: police.email,
          officerId: police.officerId,
          department: police.department,
          badgeId: police.badgeId,
          isAdmin: police.isAdmin,
          policeStation: police.policeStation,
          rank: police.rank
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to get police officer', error: err.message });
    }
  },

  // ✅ Validate token
  validateTokenMongo: async (req, res) => {
    try {
      const police = await Police.findById(req.policeId);
      if (!police) return res.status(401).json({ success: false, message: 'Invalid token' });

      res.json({
        success: true,
        message: 'Token is valid',
        police: {
          id: police._id,
          name: police.name,
          email: police.email,
          officerId: police.officerId,
          department: police.department,
          badgeId: police.badgeId,
          isAdmin: police.isAdmin,
          policeStation: police.policeStation,
          rank: police.rank
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to validate token', error: err.message });
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
