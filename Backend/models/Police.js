// Backend/models/Police.js
const mongoose = require('mongoose');

const policeSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  badgeId: { type: String, trim: true, index: true },
  rank: { type: String, trim: true },
  department: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true }, // hashed (bcrypt) recommended
  status: { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
}, { timestamps: true });

// IMPORTANT: pin to Atlas collection name "polices"
module.exports = mongoose.model('Police', policeSchema, 'polices');