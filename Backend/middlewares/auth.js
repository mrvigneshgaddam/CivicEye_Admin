const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const hdr = req.get('Authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload; // { id, email, name, badgeId }
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid/expired token' });
  }
};