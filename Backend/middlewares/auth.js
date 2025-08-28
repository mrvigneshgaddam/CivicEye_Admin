// Backend/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authz = req.get('Authorization') || '';
  const [, token] = authz.split(' ');
  if (!token) return res.status(401).json({ success: false, message: 'Missing Authorization token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};