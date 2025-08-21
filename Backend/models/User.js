// models/User.js

const { db } = require('../config/db'); // Firebase
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For MongoDB users

/******************************
 * Firebase User Class
 ******************************/
class UserFirebase {
  constructor(data) {
    this.uid = data.uid;
    this.displayName = data.displayName;
    this.email = data.email;
    this.photoURL = data.photoURL;
    this.online = data.online || false;
    this.lastSeen = data.lastSeen || new Date();
    this.isAdmin = data.isAdmin || false;
    this.createdAt = data.createdAt || new Date();
    this.publicKey = data.publicKey;
  }

  static async findById(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? new UserFirebase({ uid, ...doc.data() }) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    try {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => new UserFirebase({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      throw error;
    }
  }

  async save() {
    try {
      const userData = { ...this };
      delete userData.uid; // UID is the document ID
      await db.collection('users').doc(this.uid).set(userData, { merge: true });
      return this;
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(uid, status) {
    try {
      await db.collection('users').doc(uid).update({
        online: status,
        lastSeen: new Date()
      });
    } catch (error) {
      throw error;
    }
  }
}

/******************************
 * MongoDB User Schema
 ******************************/
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  publicKey: {
    type: String
  },
  encryptedPrivateKey: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual field for password (auto-hashes)
UserSchema.virtual('password')
  .set(function(password) {
    this._password = password;
  })
  .get(function() {
    return this._password;
  });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this._password) {
    try {
      const saltRounds = 12;
      this.passwordHash = await bcrypt.hash(this._password, saltRounds);
      this._password = undefined;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Verify password method
UserSchema.methods.verifyPassword = async function(password) {
  if (!this.passwordHash) {
    if (this.password && this.password === password) {
      this.passwordHash = await bcrypt.hash(password, 12);
      this.password = undefined;
      await this.save();
      return true;
    }
    throw new Error('No password hash set for this user');
  }
  return await bcrypt.compare(password, this.passwordHash);
};

// Update lastSeen timestamp
UserSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

// Remove sensitive fields from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.encryptedPrivateKey;
  delete user._password;
  return user;
};

const UserMongo = mongoose.model('User', UserSchema);

module.exports = { UserFirebase, UserMongo };
