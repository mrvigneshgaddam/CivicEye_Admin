// controllers/authController.js

const { admin } = require('../config/db'); // Firebase Admin
const User = require('../models/User');   // Works for both Firebase and MongoDB
const jwt = require('jsonwebtoken');

const authController = {

  /******************************
   * Firebase Authentication
   ******************************/
  
  // Login with Firebase ID token
  loginFirebase: async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'ID token required' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Get or create user in Firestore
      let user = await User.findById(decodedToken.uid);
      if (!user) {
        user = new User({
          uid: decodedToken.uid,
          displayName: decodedToken.name || `User ${decodedToken.uid.substring(0, 8)}`,
          email: decodedToken.email,
          photoURL: decodedToken.picture,
          online: true,
          lastSeen: new Date()
        });
        await user.save();
      } else {
        await User.updateStatus(decodedToken.uid, true);
      }

      const customToken = await admin.auth().createCustomToken(decodedToken.uid);

      res.json({
        token: customToken,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          online: user.online
        }
      });
    } catch (error) {
      console.error('Firebase login error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  },

  logoutFirebase: async (req, res) => {
    try {
      await User.updateStatus(req.user.uid, false);
      res.json({ success: true });
    } catch (error) {
      console.error('Firebase logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  getProfileFirebase: async (req, res) => {
    try {
      const user = await User.findById(req.user.uid);
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        online: user.online,
        lastSeen: user.lastSeen,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Get Firebase profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  updateProfileFirebase: async (req, res) => {
    try {
      const { displayName, photoURL, publicKey } = req.body;
      const user = await User.findById(req.user.uid);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      if (publicKey) user.publicKey = publicKey;

      await user.save();

      res.json({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        online: user.online
      });
    } catch (error) {
      console.error('Update Firebase profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  /******************************
   * MongoDB Authentication
   ******************************/
  
  registerMongo: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email and password are required' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      const user = new User({ name, email: email.toLowerCase(), password });
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
      });
    } catch (err) {
      console.error('MongoDB registration error:', err);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    }
  },

  loginMongo: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const isMatch = await user.verifyPassword(password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      await user.updateLastSeen();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
          publicKey: user.publicKey,
        },
      });
    } catch (err) {
      console.error('MongoDB login error:', err);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    }
  },

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
          isAdmin: user.isAdmin,
          publicKey: user.publicKey,
        },
      });
    } catch (err) {
      console.error('MongoDB get current user error:', err);
      res.status(500).json({ success: false, message: 'Failed to get user' });
    }
  },

  validateTokenMongo: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ success: false, message: 'User not found' });

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
      });
    } catch (err) {
      console.error('MongoDB token validation error:', err);
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  },

};

module.exports = authController;
