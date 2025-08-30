const mongoose = require('mongoose');
const crypto = require('crypto');
const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  publicKey: String,
  encryptedPrivateKey: String,
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  department: { type: String, enum: ['police', 'fire', 'medical', 'dispatch', 'admin'], default: 'police' },
  badgeNumber: { type: String, unique: true, sparse: true }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await argon2.hash(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
};

// Generate RSA key pair
userSchema.methods.generateKeyPair = function() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  this.publicKey = publicKey;
  return privateKey;
};

// Encrypt / decrypt messages
userSchema.statics.encryptMessage = function(message, publicKey) {
  const bufferMessage = Buffer.from(message, 'utf8');
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    bufferMessage
  );
  return encrypted.toString('base64');
};

userSchema.methods.decryptMessage = function(encryptedMessage) {
  try {
    const bufferMessage = Buffer.from(encryptedMessage, 'base64');
    const decrypted = crypto.privateDecrypt(
      { key: this.encryptedPrivateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      bufferMessage
    );
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Failed to decrypt message');
  }
};

module.exports = mongoose.model('User', userSchema);
