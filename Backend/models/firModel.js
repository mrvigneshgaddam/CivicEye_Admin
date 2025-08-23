// models/firModel.js
const mongoose = require('mongoose');

const firSchema = new mongoose.Schema({
  complainantName: {
    type: String,
    required: true,
    trim: true,
  },
  complainantContact: {
    type: String,
    required: true,
    trim: true,
  },
  accusedName: {
    type: String,
    trim: true,
  },
  incidentDate: {
    type: Date,
    required: true,
  },
  incidentLocation: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  policeStation: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['filed', 'under-investigation', 'closed'],
    default: 'filed',
  },
  filedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('FIR', firSchema);
