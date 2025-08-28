const jwt = require('jsonwebtoken');
const Police = require('../models/Police');

function sign(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, badgeId: user.badgeId },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  // include password field explicitly (select: false on schema)
  const user = await Police.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = sign(user);
  const safeUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    badgeId: user.badgeId,
    rank: user.rank,
    department: user.department,
    status: user.status,
  };

  return res.json({ success: true, token, user: safeUser });
};

// (optional) POST /api/auth/register  — for seeding from UI; remove in prod
exports.register = async (req, res) => {
  const { name, email, password, phone, badgeId, rank, department } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, password required' });
  }
  const exists = await Police.findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(409).json({ success: false, message: 'Email already exists' });

  const u = await Police.create({ name, email, password, phone, badgeId, rank, department });
  return res.status(201).json({ success: true, id: u._id });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const user = await Police.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  delete user.password;
  res.json({ success: true, user });
};