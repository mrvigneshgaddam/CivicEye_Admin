require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const firRoutes = require('./routes/firRoutes');
const officerRoutes = require('./routes/officerRoutes');
const profileRoutes = require('./routes/profileRoutes');

// DB bootstrap
const { connectDB, initializeFirebase } = require('./config/db');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);

/* ----------------------------- CORS ----------------------------- */
const devOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5000', 'http://127.0.0.1:5000',
  'http://localhost:5005', 'http://127.0.0.1:5005',
  'http://localhost:8000', 'http://127.0.0.1:8000',
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:5501', 'http://127.0.0.1:5501',
  'http://localhost:5173', 'http://127.0.0.1:5173'
];

const prodList = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production' ? prodList : devOrigins;

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true); // mobile apps, curl, Postman
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CORS] Dev allow:', origin);
      return cb(null, true);
    }
    console.log('[CORS] Blocked origin:', origin);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

/* -------------------------- Security --------------------------- */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(hpp());
app.use(mongoSanitize());
app.disable('x-powered-by');

/* ------------------------ Rate limiting ------------------------ */
const skipOptions = req => req.method === 'OPTIONS';
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000, skip: skipOptions,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skip: skipOptions,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true, legacyHeaders: false
});
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, skip: skipOptions,
  message: { error: 'Too many dashboard requests.' },
  standardHeaders: true, legacyHeaders: false
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/dashboard', dashboardLimiter);

/* --------------------------- Parsers --------------------------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ----------------------- DB connections ------------------------ */
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';
initializeFirebase();
connectDB();

/* ---------------------------- Routes --------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/fir', firRoutes);          // <-- FIR endpoints live here
app.use('/api/officers', officerRoutes);
app.use('/api/profile', profileRoutes);

/* -------------------------- Static files ----------------------- */
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../FrontEnd')));
app.use('/public', express.static(path.join(__dirname, '../FrontEnd/public')));

/* -------------------------- Health check ----------------------- */
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins
  });
});

/* --------------------------- API root -------------------------- */
app.get('/api', (req, res) => {
  res.json({
    message: 'CivicEye API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      dashboard: '/api/dashboard',
      emergency: '/api/emergency',
      fir: '/api/fir',
      officers: '/api/officers',
      profile: '/api/profile',
      health: '/api/health'
    }
  });
});
app.get('/api/fir/ping',(req,res) => res.json({ ok:true}));
/* -------------------------- SPA fallback ----------------------- */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../FrontEnd/index.html'));
});

/* ------------------------- 404 for /api ------------------------ */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    message: 'The requested API endpoint does not exist'
  });
});

/* ------------------------ Global errors ------------------------ */
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: `Request from origin ${req.get('Origin')} not allowed`,
      allowedOrigins
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token', message: 'Please provide a valid authentication token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired', message: 'Your session has expired. Please login again.' });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, error: 'Duplicate entry', message: `${field} already exists `});
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/* ------------------------- Start server ------------------------ */
const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use');
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('CivicEye Server Started');
  console.log('Local:   http://localhost:' + PORT);
  console.log('Health:  http://localhost:' + PORT + '/api/health');
  console.log('FIR API: http://localhost:' + PORT + '/api/fir');
  console.log('Env:     ' + (process.env.NODE_ENV || 'development'));
  console.log('DB:      ' + (mongoUri.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB'));
});