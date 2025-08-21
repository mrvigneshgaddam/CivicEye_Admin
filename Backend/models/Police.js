const mongoose = require('mongoose');

const PoliceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['On Duty', 'Off Duty'],
    default: 'On Duty'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Police', PoliceSchema);
