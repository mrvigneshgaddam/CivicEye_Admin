const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    trim: true,
    enum: ['Fire', 'Medical', 'Traffic', 'Security', 'Other']
  },
  description: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 10
  },
  location: { 
    type: String, 
    required: true, 
    trim: true 
  },
  reportedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);