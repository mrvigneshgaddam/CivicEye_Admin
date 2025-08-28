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

// ---------- Import routes ----------
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');  
const dashboardRoutes = require('./routes/dashboardRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const firRoutes = require('./routes/firRoutes');
const officerRoutes = require('./routes/officerRoutes');
const profileRoutes = require('./routes/profileRoutes');

// ---------- Import database configuration ----------
const { connectDB, initializeFirebase } = require('./config/db');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);


// ---------- CORS Configuration ----------
// ---------- CORS Configuration ----------


// Add development URLs



const allowlist = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Add development URLs
if (process.env.NODE_ENV === 'development') {
  allowlist.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5005', 
    'http://127.0.0.1:5005',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
      "http://127.0.0.1:5501"
  );
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowlist.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));
// Update your CORS configuration to be more permissive in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowlist.includes(origin)) {
      callback(null, true);
    } else {
      // Instead of blocking, allow all in development
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// ---------- Security Middleware ----------
// Helmet with proper CSP
const cspConnectSources = ["'self'", ...allowlist.filter(url => url.startsWith('http'))];
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      connectSrc: ["'self'", ...cspConnectSources, "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Additional security middleware
app.use(hpp());
app.use(mongoSanitize());
app.disable('x-powered-by');

// ---------- Rate Limiting ----------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many dashboard requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/dashboard', dashboardLimiter);

// ---------- Body Parsers ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Database Connection ----------
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiceye';

// Initialize Firebase
initializeFirebase();

// Connect to MongoDB
connectDB();

// ---------- Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);  // This line will now work
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/fir', firRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/profile', profileRoutes);

// ---------- Static Files ----------
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../FrontEnd')));
app.use('/public', express.static(path.join(__dirname, '../FrontEnd/public')));

// ---------- Health Check ----------
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ---------- API Welcome ----------
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

// ---------- SPA Fallback ----------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../FrontEnd/index.html'));
});

// ---------- Error Handling ----------

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    message: 'The requested API endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please provide a valid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Your session has expired. Please login again.'
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: `${field} already exists`
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS blocked',
      message: 'Request not allowed from this origin'
    });
  }

  // Default error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 CivicEye Server Started');
  console.log('================================');
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📈 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log('================================');
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: ${mongoUri.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB'}`);
  console.log('================================\n');
});

// ---------- Graceful Shutdown ----------
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('❌ Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});