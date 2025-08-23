// models/Emergency.js
const mongoose = require('mongoose');

const EmergencySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['fire', 'medical', 'crime', 'accident', 'other'], // you can add/remove types
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending',
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Emergency', EmergencySchema);
