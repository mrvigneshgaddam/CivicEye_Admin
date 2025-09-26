// Backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Police = require('../models/Police');
const Settings = require('../models/Settings');
const { sendAdminEmail, sendAdminNotification } = require('../utils/sendAdminEmail');
const admin = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 24 * 60 * 60 * 1000, path: '/' };
}

// ---------------- HELPER: Failed Login ---------------- //
async function handleFailedLogin(userId) {
  try {
    let settings = await Settings.findOne({ policeId: userId });

    if (!settings) {
      settings = new Settings({ policeId: userId });
    }

    settings.security.failedLoginAttempts += 1;

    const maxAttempts = settings.security.loginAttempts || 5;
    const shouldLock = settings.security.failedLoginAttempts >= maxAttempts;

    if (shouldLock) {
      settings.security.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await Police.findById(userId);
      if (user) {
        try {
          await sendAdminEmail(user);
          console.log(`Account lock email sent to user: ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send lock notification email:', emailError);
        }

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

// ---------------- HELPER: Successful Login ---------------- //
async function handleSuccessfulLogin(userId) {
  try {
    let settings = await Settings.findOne({ policeId: userId });

    if (!settings) {
      settings = new Settings({ policeId: userId });
    }

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

// ---------------- FIREBASE SYNC HELPER ---------------- //
async function syncUserWithFirebase(user, password = null) {
  try {
    let fbUser = null;
    
    // Try to get existing Firebase user
    try {
      if (user.firebaseUid) {
        fbUser = await admin.auth().getUser(user.firebaseUid);
      } else {
        fbUser = await admin.auth().getUserByEmail(user.email);
      }
    } catch (error) {
      // User doesn't exist in Firebase, create new one
      if (error.code === 'auth/user-not-found') {
        const userData = {
          email: user.email,
          displayName: user.name,
          disabled: false
        };

        // Only set password if provided (for new users)
        if (password) {
          userData.password = password;
        }

        // Set photoURL only if it's a valid URL
        if (user.profilePic && /^https?:\/\//i.test(user.profilePic)) {
          userData.photoURL = user.profilePic;
        }

        fbUser = await admin.auth().createUser(userData);
        console.log(`✅ Created new Firebase user: ${user.email}`);
      } else {
        throw error;
      }
    }

    // Update Firebase user with current data
    if (fbUser) {
      const updateData = {
        email: user.email,
        displayName: user.name,
        disabled: user.status !== 'Active'
      };

      if (user.profilePic && /^https?:\/\//i.test(user.profilePic)) {
        updateData.photoURL = user.profilePic;
      }

      await admin.auth().updateUser(fbUser.uid, updateData);
      
      // Update MongoDB with Firebase UID if not set
      if (!user.firebaseUid || user.firebaseUid !== fbUser.uid) {
        user.firebaseUid = fbUser.uid;
        await user.save();
      }

      return fbUser;
    }

    return null;
  } catch (error) {
    console.error('Firebase sync error:', error);
    throw error;
  }
}

// ---------------- LOGIN ---------------- //
exports.login = async (req, res) => {
  try {
    const rawEmail = (req.body?.email || '').trim();
    const email = rawEmail.toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await Police.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account status
    if (user.status !== 'Active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    const settings = await Settings.findOne({ policeId: user._id });
    if (settings && settings.security.lockedUntil && settings.security.lockedUntil > new Date()) {
      const lockTime = settings.security.lockedUntil;
      const timeLeft = Math.ceil((lockTime - new Date()) / (1000 * 60 * 60));

      return res.status(423).json({
        success: false,
        message: `Account locked. Please check your email for instructions or contact administrator. Account will be unlocked in approximately ${timeLeft} hours.`
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
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

    await handleSuccessfulLogin(user._id);

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('token', token, cookieOpts());

    // ---------------- FIREBASE SYNC ---------------- //
    let firebaseToken = null;
    try {
      const fbUser = await syncUserWithFirebase(user, password);
      
      if (fbUser && user.firebaseUid) {
        firebaseToken = await admin.auth().createCustomToken(user.firebaseUid);
        console.log(`✅ Firebase token generated for: ${user.email}`);
      }
    } catch (fbErr) {
      console.error('Firebase sync error (non-fatal):', fbErr);
      // Continue without Firebase token - don't block login
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      firebaseUid: user.firebaseUid || null,
      profilePic: user.profilePic,
      department: user.department,
      rank: user.rank
    };

    return res.json({
      success: true,
      token,
      user: userData,
      firebaseToken: firebaseToken || null,
      message: firebaseToken ? 'Login successful' : 'Login successful (Firebase sync issue)'
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ---------------- ENHANCED VERIFY ENDPOINT ---------------- //
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

    // Sync with Firebase on verify (ensure Firebase user exists)
    try {
      await syncUserWithFirebase(user);
    } catch (fbError) {
      console.error('Firebase sync during verify failed:', fbError);
    }

    delete user.password;

    res.json({ 
      success: true, 
      user,
      firebaseUid: user.firebaseUid 
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// ---------------- LOGOUT ---------------- //
exports.logout = async (req, res) => {
  res.clearCookie('token', { ...cookieOpts(), maxAge: 0 });
  res.json({ success: true, message: 'Logged out successfully' });
};

// ---------------- ME ---------------- //
exports.me = async (req, res) => {
  try {
    const user = await Police.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    delete user.password;
    
    // Ensure Firebase sync
    try {
      await syncUserWithFirebase(user);
    } catch (fbError) {
      console.error('Firebase sync during me endpoint failed:', fbError);
    }

    res.json({ 
      success: true, 
      data: user,
      firebaseUid: user.firebaseUid 
    });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user data' 
    });
  }
};

// ---------------- FIREBASE TOKEN REFRESH ---------------- //
exports.refreshFirebaseToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Police.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.firebaseUid) {
      // Sync user to Firebase first
      await syncUserWithFirebase(user);
    }

    const firebaseToken = await admin.auth().createCustomToken(user.firebaseUid);
    
    res.json({
      success: true,
      firebaseToken,
      firebaseUid: user.firebaseUid
    });
  } catch (error) {
    console.error('Firebase token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh Firebase token'
    });
  }
};