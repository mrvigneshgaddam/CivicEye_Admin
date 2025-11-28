// Backend/models/Police.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PoliceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  phone: { type: String, trim: true },
  badgeId: { type: String, trim: true },
  officerId: { type: String, unique: true, sparse: true }, // sparse allows multiple nulls
  rank: { type: String, trim: true },
  department: { type: String, trim: true },
  status: { type: String, default: 'Active' },
  assignedCases: { type: Number, default: 0 },
  assignedReports: { type: [String], default: [] }, // array of report IDs
  policeStation: { type: String, trim: true },
  password: { type: String, required: true, select: false }, // select:false -> must use .select('+password')
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },// for account activation/deactivation
  firebaseUid: { type: String, unique: true, sparse: true }, // Added for Firebase integration
  profilePic: { type: String, default: '' }, // Added for profile pictures
  privateKey: { type: String, default: '' }, // Added for cryptographic keys
  publicKey: { type: String, default: '' } 
}, { 
  timestamps: true,
  collection: 'polices' // specify collection name
});

// Hash password before saving
PoliceSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
PoliceSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

module.exports = mongoose.model('Police', PoliceSchema);
