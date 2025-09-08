// Backend/controllers/settingsController.js
const Settings = require('../models/Settings');
const Police = require('../models/Police');

// Get settings for current police officer
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({ policeId: req.policeId });
    
    if (!settings) {
      // Create default settings if none exist
      const newSettings = new Settings({
        policeId: req.policeId,
        security: {
          require2FA: false,
          strongPasswords: true,
          sessionTimeout: 30,
          loginAttempts: 5,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: null,
          ipWhitelisting: false,
          allowedIPs: []
        },
        alerts: {
          emergencyAlerts: true,
          firUpdates: true,
          officerActivities: false,
          emailAlerts: true,
          smsAlerts: false,
          pushAlerts: true
        },
        system: {
          backupFrequency: 'weekly',
          logRetention: '90',
          autoUpdates: true,
          maintenanceWindow: '02:00-06:00'
        },
        access: {
          adminPrivileges: 'standard',
          exportPermissions: true,
          activityMonitoring: true,
          loginAuditing: true
        }
      });
      
      await newSettings.save();
      return res.json(newSettings);
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings' 
    });
  }
};

// Save settings for a specific section
exports.saveSettings = async (req, res) => {
  try {
    const { section } = req.params;
    const updateData = req.body;
    
    let settings = await Settings.findOne({ policeId: req.policeId });
    
    if (!settings) {
      // Create new settings if none exist
      settings = new Settings({ policeId: req.policeId });
    }
    
    // Update the specific section
    if (section === 'security') {
      settings.security = { ...settings.security, ...updateData };
    } else if (section === 'alerts') {
      settings.alerts = { ...settings.alerts, ...updateData };
    } else if (section === 'system') {
      settings.system = { ...settings.system, ...updateData };
    } else if (section === 'access') {
      settings.access = { ...settings.access, ...updateData };
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid settings section' 
      });
    }
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
};

// Handle login attempt and update failed attempts
exports.handleLoginAttempt = async (req, res) => {
  try {
    const { policeId, success } = req.body;
    
    if (!policeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Police ID is required' 
      });
    }
    
    let settings = await Settings.findOne({ policeId });
    
    if (!settings) {
      settings = new Settings({ policeId });
    }
    
    if (success) {
      // Reset failed attempts on successful login
      settings.security.failedLoginAttempts = 0;
      settings.security.lockedUntil = null;
      settings.security.lastLogin = new Date();
    } else {
      // Increment failed attempts
      settings.security.failedLoginAttempts += 1;
      
      // Check if account should be locked
      const maxAttempts = settings.security.loginAttempts || 5;
      if (settings.security.failedLoginAttempts >= maxAttempts) {
        // Lock account for 24 hours
        settings.security.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
    
    await settings.save();
    
    res.json({
      success: true,
      failedAttempts: settings.security.failedLoginAttempts,
      lockedUntil: settings.security.lockedUntil,
      isLocked: settings.security.lockedUntil && settings.security.lockedUntil > new Date()
    });
  } catch (error) {
    console.error('Login attempt error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process login attempt' 
    });
  }
};

// Unlock a locked account (admin function)
exports.unlockAccount = async (req, res) => {
  try {
    const { policeId } = req.body;
    
    if (!req.police.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const settings = await Settings.findOne({ policeId });
    
    if (!settings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found for this police officer' 
      });
    }
    
    // Unlock the account
    settings.security.failedLoginAttempts = 0;
    settings.security.lockedUntil = null;
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'Account unlocked successfully' 
    });
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unlock account' 
    });
  }
};

// Check if an account is locked
exports.checkAccountLock = async (req, res) => {
  try {
    const { policeId } = req.params;
    
    const settings = await Settings.findOne({ policeId });
    
    if (!settings) {
      return res.json({ 
        locked: false,
        failedAttempts: 0,
        lockedUntil: null
      });
    }
    
    const isLocked = settings.security.lockedUntil && settings.security.lockedUntil > new Date();
    
    res.json({
      locked: isLocked,
      failedAttempts: settings.security.failedLoginAttempts,
      lockedUntil: settings.security.lockedUntil,
      maxAttempts: settings.security.loginAttempts || 5
    });
  } catch (error) {
    console.error('Check account lock error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check account lock status' 
    });
  }
};

// Get settings by police ID (admin function)
exports.getSettingsByPoliceId = async (req, res) => {
  try {
    const { policeId } = req.params;
    
    if (!req.police.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const settings = await Settings.findOne({ policeId });
    
    if (!settings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found' 
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings by police ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings' 
    });
  }
};

// Update settings by police ID (admin function)
exports.updateSettingsByPoliceId = async (req, res) => {
  try {
    const { policeId } = req.params;
    const updateData = req.body;
    
    if (!req.police.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    let settings = await Settings.findOne({ policeId });
    
    if (!settings) {
      settings = new Settings({ policeId });
    }
    
    // Update settings
    if (updateData.security) {
      settings.security = { ...settings.security, ...updateData.security };
    }
    if (updateData.alerts) {
      settings.alerts = { ...settings.alerts, ...updateData.alerts };
    }
    if (updateData.system) {
      settings.system = { ...settings.system, ...updateData.system };
    }
    if (updateData.access) {
      settings.access = { ...settings.access, ...updateData.access };
    }
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Update settings by police ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
};