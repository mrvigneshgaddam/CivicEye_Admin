// Backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Police = require('../models/Police');
const Settings = require('../models/Settings');
const { sendAdminEmail, sendAdminNotification } = require('../utils/sendAdminEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 24*60*60*1000, path: '/' };
}

// Helper function to handle failed login attempts
async function handleFailedLogin(userId) {
  try {
    let settings = await Settings.findOne({ policeId: userId });
    
    if (!settings) {
      settings = new Settings({ policeId: userId });
    }
    
    // Increment failed attempts
    settings.security.failedLoginAttempts += 1;
    
    // Check if account should be locked
    const maxAttempts = settings.security.loginAttempts || 5;
    const shouldLock = settings.security.failedLoginAttempts >= maxAttempts;
    
    if (shouldLock) {
      // Lock account for 24 hours
      settings.security.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Send email notification to user and admin
      const user = await Police.findById(userId);
      if (user) {
        try {
          await sendAdminEmail(user); // Send to the user
          console.log(`Account lock email sent to user: ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send lock notification email:', emailError);
        }
        
        // Also send admin notification if configured
        if (process.env.ADMIN_EMAIL) {
          try {
            await sendAdminNotification(user);
            console.log(`Admin notification sent for locked account: ${user.email}`);
          } catch (adminEmailError) {
            console.error('Failed to send admin notification:', adminEmailError);
          }
        }
      }
    }
    
    await settings.save();
    
    return {
      failedAttempts: settings.security.failedLoginAttempts,
      lockedUntil: settings.security.lockedUntil,
      isLocked: shouldLock,
      maxAttempts: maxAttempts
    };
  } catch (error) {
    console.error('Failed login recording error:', error);
    return null;
  }
}

// Helper function to handle successful login
async function handleSuccessfulLogin(userId) {
  try {
    let settings = await Settings.findOne({ policeId: userId });
    
    if (!settings) {
      settings = new Settings({ policeId: userId });
    }
    
    // Reset failed attempts on successful login
    settings.security.failedLoginAttempts = 0;
    settings.security.lockedUntil = null;
    settings.security.lastLogin = new Date();
    
    await settings.save();
    
    return settings;
  } catch (error) {
    console.error('Successful login recording error:', error);
    return null;
  }
}

exports.login = async (req, res) => {
  const rawEmail = (req.body?.email || '').trim();
  const email = rawEmail.toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  // Because password has select:false
  const user = await Police.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Check if account is locked
  const settings = await Settings.findOne({ policeId: user._id });
  if (settings && settings.security.lockedUntil && settings.security.lockedUntil > new Date()) {
    const lockTime = settings.security.lockedUntil;
    const timeLeft = Math.ceil((lockTime - new Date()) / (1000 * 60 * 60)); // Hours remaining
    
    return res.status(423).json({ 
      success: false, 
      message: `Account locked. Please check your email for instructions or contact administrator. Account will be unlocked in approximately ${timeLeft} hours.` 
    });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    // Record failed attempt
    const loginResult = await handleFailedLogin(user._id);
    
    if (loginResult && loginResult.isLocked) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account locked due to too many failed attempts. Please check your email for instructions.' 
      });
    }
    
    const attemptsLeft = (settings?.security.loginAttempts || 5) - (loginResult?.failedAttempts || 1);
    
    return res.status(401).json({ 
      success: false, 
      message: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before account lock.` 
    });
  }

  // Record successful login
  await handleSuccessfulLogin(user._id);

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

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Police.findById(decoded.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    delete user.password;

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};