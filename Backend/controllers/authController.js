const User = require('../models/User');
const jwt = require('jsonwebtoken');

const authController = {
  // Admin or system creates a new user
  registerMongo: async (req, res) => {
    try {
      const { name, email, password, username, department, badgeNumber } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email and password are required' });
      }

      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username },
          { badgeNumber }
        ]
      });

      if (existingUser) {
        let message = 'User already exists';
        if (existingUser.email === email.toLowerCase()) message = 'Email already in use';
        if (existingUser.username === username) message = 'Username already taken';
        if (existingUser.badgeNumber === badgeNumber) message = 'Badge number already exists';
        return res.status(400).json({ success: false, message });
      }

      // ✅ User.js pre('save') will hash password with argon2
      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        username,
        department,
        badgeNumber
      });

      // Generate RSA key pair
      const privateKey = user.generateKeyPair();
      user.encryptedPrivateKey = privateKey; // ⚠️ store securely later

      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          department: user.department,
          badgeNumber: user.badgeNumber,
          isAdmin: user.isAdmin,
          publicKey: user.publicKey
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    }
  },

  // Login
  loginMongo: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
        isActive: true
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // ✅ Check argon2 password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      user.lastSeen = new Date();
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          department: user.department,
          badgeNumber: user.badgeNumber,
          isAdmin: user.isAdmin,
          publicKey: user.publicKey
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    }
  },

  // Current user
  getCurrentUserMongo: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          department: user.department,
          badgeNumber: user.badgeNumber,
          isAdmin: user.isAdmin,
          publicKey: user.publicKey
        }
      });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ success: false, message: 'Failed to get user' });
    }
  },

  // Validate JWT token
  validateTokenMongo: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          department: user.department,
          badgeNumber: user.badgeNumber,
          isAdmin: user.isAdmin,
          publicKey: user.publicKey
        }
      });
    } catch (err) {
      console.error('Validate token error:', err);
      res.status(500).json({ success: false, message: 'Failed to validate token' });
    }
  }
};

module.exports = authController;
