// Backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Police = require('../models/Police');

const signToken = (user) =>
  jwt.sign(
    { sub: user._id, email: user.email, name: user.name, role: 'police' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '8h' }
  );

exports.login = async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await Police.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // If stored password looks like bcrypt, compare with bcrypt; else fall back to strict plain comparison
    const looksHashed = typeof user.password === 'string' && /^\$2[aby]\$/.test(user.password);
    let ok = false;
    if (looksHashed) {
      ok = await bcrypt.compare(password, user.password);
    } else {
      ok = password === user.password; // only for legacy plaintext data
    }

    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        badgeId: user.badgeId,
        rank: user.rank,
        department: user.department,
        status: user.status,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// (Optional) helper to hash a password on create/update going forward
exports.hashPassword = async (plain) => bcrypt.hash(plain, 10);