// // const mongoose = require('mongoose');

// // const ReportSchema = new mongoose.Schema({
// //   type: { 
// //     type: String, 
// //     required: true, 
// //     trim: true,
// //     enum: ['Fire', 'Medical', 'Traffic', 'Security', 'Other']
// //   },
// //   description: { 
// //     type: String, 
// //     required: true, 
// //     trim: true,
// //     minlength: 10
// //   },
// //   location: { 
// //     type: String, 
// //     required: true, 
// //     trim: true 
// //   },
// //   reportedAt: { 
// //     type: Date, 
// //     default: Date.now 
// //   },
// //   status: {
// //     type: String,
// //     enum: ['Pending', 'In Progress', 'Resolved'],
// //     default: 'Pending'
// //   }
// // }, {
// //   timestamps: true
// // });

// // module.exports = mongoose.model('Report', ReportSchema);
// const mongoose = require('mongoose');

// const ReportSchema = new mongoose.Schema({
//   firId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   complainant: {
//     name: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     contact: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     address: {
//       type: String,
//       required: true,
//       trim: true
//     }
//   },
//   incidentType: {
//     type: String,
//     required: true,
//     trim: true,
//     enum: ['Theft', 'Assault', 'Burglary', 'Vandalism', 'Traffic Accident', 'Other']
//   },
//   description: {
//     type: String,
//     required: true,
//     trim: true,
//     minlength: 10
//   },
//   location: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   incidentDateTime: {
//     type: Date,
//     required: true
//   },
//   reportedAt: {
//     type: Date,
//     default: Date.now
//   },
//   status: {
//     type: String,
//     enum: ['Pending', 'In Progress', 'Resolved', 'Urgent'],
//     default: 'Pending'
//   },
//   priority: {
//     type: String,
//     enum: ['Low', 'Medium', 'High'],
//     default: 'Medium'
//   },
//   assignedOfficer: {
//     type: String,
//     default: 'Unassigned'
//   },
//   evidence: [{
//     type: String // URLs to uploaded evidence files
//   }],
//   updates: [{
//     message: String,
//     updatedBy: String,
//     timestamp: {
//       type: Date,
//       default: Date.now
//     }
//   }]
// }, {
//   timestamps: true
// });

// // Generate FIR ID before saving
// ReportSchema.pre('save', async function(next) {
//   if (this.isNew) {
//     const count = await mongoose.model('Report').countDocuments();
//     this.firId = `FIR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
//   }
//   next();
// });

// module.exports = mongoose.model('Report', ReportSchema);
// models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  firId: {
    type: String,
    required: true,
    unique: true
  },
  complainant: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    contact: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  },
  incidentType: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  incidentDateTime: {
    type: Date,
    required: true
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Urgent'],
    default: 'Pending'
  },
  assignedOfficer: {
    type: String,
    default: 'Unassigned'
  }
}, {
  timestamps: true
});

// Generate FIR ID before saving
ReportSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Report').countDocuments();
    this.firId = `FIR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Report', ReportSchema);