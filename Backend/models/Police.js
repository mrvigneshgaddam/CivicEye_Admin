// Backend/models/Police.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PoliceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  phone: String,
  badgeId: String,
  officerId: { type: String, unique: true, sparse: true }, // sparse allows multiple nulls
  rank: String,
  department: String,
  status: { type: String, default: 'Active' },
  assignedCases: { type: Number, default: 0 },
  assignedReports: {type:[String],default:[]}, // array of report IDs},
  policeStation: String,
  password: { type: String, required: true, select: false },   // select:false -> must .select('+password') when logging in
}, { timestamps: true });

// hash on save
PoliceSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Police', PoliceSchema);