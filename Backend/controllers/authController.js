const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Police = require('../models/Police');

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
  res.json({ success: true });
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { ...cookieOpts(), maxAge: 0 });
  res.json({ success: true });
};

exports.me = async (req, res) => {
  const u = await Police.findById(req.user.id).lean();
  if (!u) return res.status(404).json({ success: false, message: 'Not found' });
  delete u.password;
  res.json({ success: true, user: u });
};

authController.verify = async (req, res) => {
    try {
        // The auth middleware already verified the token
        res.json({ success: true, user: req.user });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};