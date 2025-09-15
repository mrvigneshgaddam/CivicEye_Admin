// Backend/models/Settings.js
const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  policeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Police', 
    required: [true, 'Police ID is required'],
    unique: true,
    index: true
  },
  security: {
    require2FA: { type: Boolean, default: false },
    strongPasswords: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 30 },
    loginAttempts: { type: Number, default: 5 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    ipWhitelisting: { type: Boolean, default: false },
    allowedIPs: [{ type: String }]
  },
  alerts: {
    emergencyAlerts: { type: Boolean, default: true },
    firUpdates: { type: Boolean, default: true },
    officerActivities: { type: Boolean, default: false },
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    pushAlerts: { type: Boolean, default: true }
  },
  system: {
    backupFrequency: { type: String, default: 'weekly' },
    logRetention: { type: String, default: '90' },
    autoUpdates: { type: Boolean, default: true },
    maintenanceWindow: { type: String, default: '02:00-06:00' }
  },
  access: {
    adminPrivileges: { type: String, default: 'standard' },
    exportPermissions: { type: Boolean, default: true },
    activityMonitoring: { type: Boolean, default: true },
    loginAuditing: { type: Boolean, default: true }
  }
}, { 
  timestamps: true 
});

// Remove any existing documents with null policeId
SettingsSchema.pre('save', function(next) {
  if (this.policeId === null || this.policeId === undefined) {
    return next(new Error('Police ID is required'));
  }
  next();
});

module.exports = mongoose.model('Settings', SettingsSchema);