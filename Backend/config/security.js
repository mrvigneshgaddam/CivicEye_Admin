// config/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// ---------- Security Headers ----------
exports.securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://randomuser.me", "https://api.dicebear.com"],
      connectSrc: ["'self'", "https://firestore.googleapis.com", "https://firebasedatabase.app"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// ---------- General Rate Limiter ----------
exports.limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- Auth-specific Rate Limiter ----------
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- Other Security Middlewares ----------
exports.extraSecurity = [
  hpp(),             // Prevent HTTP parameter pollution
  mongoSanitize()    // Prevent NoSQL injection
];

// ---------- HTTPS configuration (Production only) ----------
// Commented out for local dev to avoid ENOENT
/*
const fs = require('fs');
exports.sslOptions = {
  key: fs.readFileSync('path/to/private.key'),
  cert: fs.readFileSync('path/to/certificate.crt'),
  minVersion: 'TLSv1.3'
};
*/
