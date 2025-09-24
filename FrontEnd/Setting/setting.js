document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    let authToken = sessionStorage.getItem('authToken');
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    
    console.log('Auth Token exists:', !!authToken);
    console.log('Current User:', currentUser);

    // ✅ Enhanced authentication with backend validation
    async function isAuthenticated() {
        const token = sessionStorage.getItem('authToken');

        if (!token || token === 'null' || token === 'undefined') {
            return false;
        }

        // Basic JWT format check
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            return false;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                console.warn("Token invalid or expired");
                sessionStorage.removeItem("authToken");
                sessionStorage.removeItem("currentUser");
                return false;
            }

            const data = await res.json();
            console.log('Auth /me response:', data);   // <— helps debugging

            // ✅ Accept data.police OR data.user OR data.currentUser, etc.
            const userData = data.police || data.user || data.currentUser || data;

            if (data.success && userData) {
                sessionStorage.setItem("currentUser", JSON.stringify(userData));
                currentUser = userData;
                return true;
            } else {
                console.warn("User data missing, clearing token");
                sessionStorage.removeItem("authToken");
                sessionStorage.removeItem("currentUser");
                return false;
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            return false;
        }
    }

    // ✅ Run authentication check on page load
    const loggedIn = await isAuthenticated();
    if (!loggedIn) {
        alert('Please login to access settings');
        window.location.href = '/index.html';
        return;
    }

    console.log("✅ Logged in as:", currentUser?.name || currentUser?.email);
    console.log('Authentication successful - loading settings');
    
    // Test API connection first
    async function testAPIConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.status === 401) {
                console.log('Token invalid - redirecting to login');
                handleAuthError();
                return false;
            }
            
            return response.ok;
        } catch (error) {
            console.warn('API connection test failed:', error);
            return false;
        }
    }
    
    // Handle authentication errors
    function handleAuthError() {
        alert('Your session has expired. Please login again.');
        // Clear stored auth data
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        // Redirect to login page with correct path
        window.location.href = '/index.html';
    }
    
    // Navigation functionality
    const navButtons = document.querySelectorAll('.nav-btn');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Remove active class from all buttons and sections
            navButtons.forEach(btn => btn.classList.remove('active'));
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked button and corresponding section
            this.classList.add('active');
            const targetSection = document.getElementById(`${sectionId}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // Load settings function - FIXED: moved before it's used
    async function loadSettings(section = 'all') {
        console.log('Loading settings for section:', section);
        
        try {
            // Test API connection first
            const apiAvailable = await testAPIConnection();
            
            if (!apiAvailable) {
                console.warn('API not available, using sessionStorage');
                loadSettingsFromSessionStorage(section);
                return;
            }
            
            // Try to load from API
            const response = await fetch(`${API_BASE_URL}/settings`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            console.log('Settings API response status:', response.status);
            
            if (response.status === 401) {
                // Token is invalid or expired
                handleAuthError();
                return;
            }
            
            if (response.ok) {
                const settings = await response.json();
                console.log('Settings loaded from API:', settings);
                updateUIWithSettings(settings, section);
                return;
            }
            
            // If we get a 404, the endpoint might not exist yet
            if (response.status === 404) {
                console.warn('Settings endpoint not found, using sessionStorage');
                loadSettingsFromSessionStorage(section);
                return;
            }
            
            throw new Error(`Failed to fetch settings: ${response.status}`);
            
        } catch (error) {
            console.warn('Error loading settings, falling back to sessionStorage:', error);
            // Fallback to sessionStorage if API fails
            loadSettingsFromSessionStorage(section);
        }
    }
    
    // Load settings from sessionStorage
    function loadSettingsFromSessionStorage(section = 'all') {
        console.log('Loading settings from sessionStorage for section:', section);
        
        const sections = section === 'all' ? ['security', 'alerts', 'system', 'access'] : [section];
        
        sections.forEach(sec => {
            // Security settings
            if (sec === 'security' || sec === 'all') {
                const require2FAElement = document.getElementById('require2FA');
                if (require2FAElement && sessionStorage.getItem('require2FA') !== null) {
                    require2FAElement.checked = sessionStorage.getItem('require2FA') === 'true';
                }
                
                const strongPasswordsElement = document.getElementById('strongPasswords');
                if (strongPasswordsElement && sessionStorage.getItem('strongPasswords') !== null) {
                    strongPasswordsElement.checked = sessionStorage.getItem('strongPasswords') === 'true';
                }
                
                const sessionTimeoutElement = document.getElementById('session-timeout');
                if (sessionTimeoutElement && sessionStorage.getItem('sessionTimeout') !== null) {
                    sessionTimeoutElement.value = sessionStorage.getItem('sessionTimeout');
                }
                
                const loginAttemptsElement = document.getElementById('login-attempts');
                if (loginAttemptsElement && sessionStorage.getItem('loginAttempts') !== null) {
                    loginAttemptsElement.value = sessionStorage.getItem('loginAttempts');
                }
                
                const ipWhitelistingElement = document.getElementById('ipWhitelisting');
                if (ipWhitelistingElement && sessionStorage.getItem('ipWhitelisting') !== null) {
                    ipWhitelistingElement.checked = sessionStorage.getItem('ipWhitelisting') === 'true';
                }
            }
            
            // Alert settings
            if (sec === 'alerts' || sec === 'all') {
                const emergencyAlertsElement = document.getElementById('emergencyAlerts');
                if (emergencyAlertsElement && sessionStorage.getItem('emergencyAlerts') !== null) {
                    emergencyAlertsElement.checked = sessionStorage.getItem('emergencyAlerts') === 'true';
                }
                
                const firUpdatesElement = document.getElementById('firUpdates');
                if (firUpdatesElement && sessionStorage.getItem('firUpdates') !== null) {
                    firUpdatesElement.checked = sessionStorage.getItem('firUpdates') === 'true';
                }
                
                const officerActivitiesElement = document.getElementById('officerActivities');
                if (officerActivitiesElement && sessionStorage.getItem('officerActivities') !== null) {
                    officerActivitiesElement.checked = sessionStorage.getItem('officerActivities') === 'true';
                }
                
                const emailAlertsElement = document.getElementById('emailAlerts');
                if (emailAlertsElement && sessionStorage.getItem('emailAlerts') !== null) {
                    emailAlertsElement.checked = sessionStorage.getItem('emailAlerts') === 'true';
                }
                
                const smsAlertsElement = document.getElementById('smsAlerts');
                if (smsAlertsElement && sessionStorage.getItem('smsAlerts') !== null) {
                    smsAlertsElement.checked = sessionStorage.getItem('smsAlerts') === 'true';
                }
                
                const pushAlertsElement = document.getElementById('pushAlerts');
                if (pushAlertsElement && sessionStorage.getItem('pushAlerts') !== null) {
                    pushAlertsElement.checked = sessionStorage.getItem('pushAlerts') === 'true';
                }
            }
            
            // System settings
            if (sec === 'system' || sec === 'all') {
                const backupFrequencyElement = document.getElementById('backup-frequency');
                if (backupFrequencyElement && sessionStorage.getItem('backupFrequency') !== null) {
                    backupFrequencyElement.value = sessionStorage.getItem('backupFrequency');
                }
                
                const logRetentionElement = document.getElementById('log-retention');
                if (logRetentionElement && sessionStorage.getItem('logRetention') !== null) {
                    logRetentionElement.value = sessionStorage.getItem('logRetention');
                }
                
                const autoUpdatesElement = document.getElementById('autoUpdates');
                if (autoUpdatesElement && sessionStorage.getItem('autoUpdates') !== null) {
                    autoUpdatesElement.checked = sessionStorage.getItem('autoUpdates') === 'true';
                }
                
                const maintenanceWindowElement = document.getElementById('maintenance-window');
                if (maintenanceWindowElement && sessionStorage.getItem('maintenanceWindow') !== null) {
                    maintenanceWindowElement.value = sessionStorage.getItem('maintenanceWindow');
                }
            }
            
            // Access control settings
            if (sec === 'access' || sec === 'all') {
                const adminPrivilegesElement = document.getElementById('admin-privileges');
                if (adminPrivilegesElement && sessionStorage.getItem('adminPrivileges') !== null) {
                    adminPrivilegesElement.value = sessionStorage.getItem('adminPrivileges');
                }
                
                const exportPermissionsElement = document.getElementById('exportPermissions');
                if (exportPermissionsElement && sessionStorage.getItem('exportPermissions') !== null) {
                    exportPermissionsElement.checked = sessionStorage.getItem('exportPermissions') === 'true';
                }
                
                const activityMonitoringElement = document.getElementById('activityMonitoring');
                if (activityMonitoringElement && sessionStorage.getItem('activityMonitoring') !== null) {
                    activityMonitoringElement.checked = sessionStorage.getItem('activityMonitoring') === 'true';
                }
                
                const loginAuditingElement = document.getElementById('loginAuditing');
                if (loginAuditingElement && sessionStorage.getItem('loginAuditing') !== null) {
                    loginAuditingElement.checked = sessionStorage.getItem('loginAuditing') === 'true';
                }
            }
        });
    }
    
    // Update UI with settings from backend
    function updateUIWithSettings(settings, section = 'all') {
        console.log('Updating UI with settings:', settings);
        
        const sections = section === 'all' ? ['security', 'alerts', 'system', 'access'] : [section];
        
        sections.forEach(sec => {
            if (sec === 'security' || sec === 'all') {
                if (settings.security) {
                    const require2FAElement = document.getElementById('require2FA');
                    if (require2FAElement) require2FAElement.checked = settings.security.require2FA || false;
                    
                    const strongPasswordsElement = document.getElementById('strongPasswords');
                    if (strongPasswordsElement) strongPasswordsElement.checked = settings.security.strongPasswords || true;
                    
                    const sessionTimeoutElement = document.getElementById('session-timeout');
                    if (sessionTimeoutElement) sessionTimeoutElement.value = settings.security.sessionTimeout || '30';
                    
                    const loginAttemptsElement = document.getElementById('login-attempts');
                    if (loginAttemptsElement) loginAttemptsElement.value = settings.security.loginAttempts || '5';
                    
                    const ipWhitelistingElement = document.getElementById('ipWhitelisting');
                    if (ipWhitelistingElement) ipWhitelistingElement.checked = settings.security.ipWhitelisting || false;
                }
            }
            
            if (sec === 'alerts' || sec === 'all') {
                if (settings.alerts) {
                    const emergencyAlertsElement = document.getElementById('emergencyAlerts');
                    if (emergencyAlertsElement) emergencyAlertsElement.checked = settings.alerts.emergencyAlerts || true;
                    
                    const firUpdatesElement = document.getElementById('firUpdates');
                    if (firUpdatesElement) firUpdatesElement.checked = settings.alerts.firUpdates || true;
                    
                    const officerActivitiesElement = document.getElementById('officerActivities');
                    if (officerActivitiesElement) officerActivitiesElement.checked = settings.alerts.officerActivities || false;
                    
                    const emailAlertsElement = document.getElementById('emailAlerts');
                    if (emailAlertsElement) emailAlertsElement.checked = settings.alerts.emailAlerts || true;
                    
                    const smsAlertsElement = document.getElementById('smsAlerts');
                    if (smsAlertsElement) smsAlertsElement.checked = settings.alerts.smsAlerts || false;
                    
                    const pushAlertsElement = document.getElementById('pushAlerts');
                    if (pushAlertsElement) pushAlertsElement.checked = settings.alerts.pushAlerts || true;
                }
            }
            
            if (sec === 'system' || sec === 'all') {
                if (settings.system) {
                    const backupFrequencyElement = document.getElementById('backup-frequency');
                    if (backupFrequencyElement) backupFrequencyElement.value = settings.system.backupFrequency || 'weekly';
                    
                    const logRetentionElement = document.getElementById('log-retention');
                    if (logRetentionElement) logRetentionElement.value = settings.system.logRetention || '90';
                    
                    const autoUpdatesElement = document.getElementById('autoUpdates');
                    if (autoUpdatesElement) autoUpdatesElement.checked = settings.system.autoUpdates || true;
                    
                    const maintenanceWindowElement = document.getElementById('maintenance-window');
                    if (maintenanceWindowElement) maintenanceWindowElement.value = settings.system.maintenanceWindow || '02:00-06:00';
                }
            }
            
            if (sec === 'access' || sec === 'all') {
                if (settings.access) {
                    const adminPrivilegesElement = document.getElementById('admin-privileges');
                    if (adminPrivilegesElement) adminPrivilegesElement.value = settings.access.adminPrivileges || 'standard';
                    
                    const exportPermissionsElement = document.getElementById('exportPermissions');
                    if (exportPermissionsElement) exportPermissionsElement.checked = settings.access.exportPermissions || true;
                    
                    const activityMonitoringElement = document.getElementById('activityMonitoring');
                    if (activityMonitoringElement) activityMonitoringElement.checked = settings.access.activityMonitoring || true;
                    
                    const loginAuditingElement = document.getElementById('loginAuditing');
                    if (loginAuditingElement) loginAuditingElement.checked = settings.access.loginAuditing || true;
                }
            }
        });
    }
    
    // Collect data from a section
    function collectSectionData(section) {
        const data = {};
        
        if (section === 'security') {
            const require2FAElement = document.getElementById('require2FA');
            const strongPasswordsElement = document.getElementById('strongPasswords');
            const sessionTimeoutElement = document.getElementById('session-timeout');
            const loginAttemptsElement = document.getElementById('login-attempts');
            const ipWhitelistingElement = document.getElementById('ipWhitelisting');
            
            data.require2FA = require2FAElement ? require2FAElement.checked : false;
            data.strongPasswords = strongPasswordsElement ? strongPasswordsElement.checked : true;
            data.sessionTimeout = sessionTimeoutElement ? sessionTimeoutElement.value : '30';
            data.loginAttempts = loginAttemptsElement ? loginAttemptsElement.value : '5';
            data.ipWhitelisting = ipWhitelistingElement ? ipWhitelistingElement.checked : false;
        }
        
        if (section === 'alerts') {
            const emergencyAlertsElement = document.getElementById('emergencyAlerts');
            const firUpdatesElement = document.getElementById('firUpdates');
            const officerActivitiesElement = document.getElementById('officerActivities');
            const emailAlertsElement = document.getElementById('emailAlerts');
            const smsAlertsElement = document.getElementById('smsAlerts');
            const pushAlertsElement = document.getElementById('pushAlerts');
            
            data.emergencyAlerts = emergencyAlertsElement ? emergencyAlertsElement.checked : true;
            data.firUpdates = firUpdatesElement ? firUpdatesElement.checked : true;
            data.officerActivities = officerActivitiesElement ? officerActivitiesElement.checked : false;
            data.emailAlerts = emailAlertsElement ? emailAlertsElement.checked : true;
            data.smsAlerts = smsAlertsElement ? smsAlertsElement.checked : false;
            data.pushAlerts = pushAlertsElement ? pushAlertsElement.checked : true;
        }
        
        if (section === 'system') {
            const backupFrequencyElement = document.getElementById('backup-frequency');
            const logRetentionElement = document.getElementById('log-retention');
            const autoUpdatesElement = document.getElementById('autoUpdates');
            const maintenanceWindowElement = document.getElementById('maintenance-window');
            
            data.backupFrequency = backupFrequencyElement ? backupFrequencyElement.value : 'weekly';
            data.logRetention = logRetentionElement ? logRetentionElement.value : '90';
            data.autoUpdates = autoUpdatesElement ? autoUpdatesElement.checked : true;
            data.maintenanceWindow = maintenanceWindowElement ? maintenanceWindowElement.value : '02:00-06:00';
        }
        
        if (section === 'access') {
            const adminPrivilegesElement = document.getElementById('admin-privileges');
            const exportPermissionsElement = document.getElementById('exportPermissions');
            const activityMonitoringElement = document.getElementById('activityMonitoring');
            const loginAuditingElement = document.getElementById('loginAuditing');
            
            data.adminPrivileges = adminPrivilegesElement ? adminPrivilegesElement.value : 'standard';
            data.exportPermissions = exportPermissionsElement ? exportPermissionsElement.checked : true;
            data.activityMonitoring = activityMonitoringElement ? activityMonitoringElement.checked : true;
            data.loginAuditing = loginAuditingElement ? loginAuditingElement.checked : true;
        }
        
        return data;
    }
    
    // Save settings to sessionStorage
    function saveToSessionStorage(section, data) {
        if (section === 'security') {
            sessionStorage.setItem('require2FA', data.require2FA);
            sessionStorage.setItem('strongPasswords', data.strongPasswords);
            sessionStorage.setItem('sessionTimeout', data.sessionTimeout);
            sessionStorage.setItem('loginAttempts', data.loginAttempts);
            sessionStorage.setItem('ipWhitelisting', data.ipWhitelisting);
        }
        
        if (section === 'alerts') {
            sessionStorage.setItem('emergencyAlerts', data.emergencyAlerts);
            sessionStorage.setItem('firUpdates', data.firUpdates);
            sessionStorage.setItem('officerActivities', data.officerActivities);
            sessionStorage.setItem('emailAlerts', data.emailAlerts);
            sessionStorage.setItem('smsAlerts', data.smsAlerts);
            sessionStorage.setItem('pushAlerts', data.pushAlerts);
        }
        
        if (section === 'system') {
            sessionStorage.setItem('backupFrequency', data.backupFrequency);
            sessionStorage.setItem('logRetention', data.logRetention);
            sessionStorage.setItem('autoUpdates', data.autoUpdates);
            sessionStorage.setItem('maintenanceWindow', data.maintenanceWindow);
        }
        
        if (section === 'access') {
            sessionStorage.setItem('adminPrivileges', data.adminPrivileges);
            sessionStorage.setItem('exportPermissions', data.exportPermissions);
            sessionStorage.setItem('activityMonitoring', data.activityMonitoring);
            sessionStorage.setItem('loginAuditing', data.loginAuditing);
        }
        
        console.log(`Settings for ${section} saved to sessionStorage`);
    }
    
    // Save settings to backend or sessionStorage
    async function saveSettings(section) {
        const data = collectSectionData(section);
        
        try {
            // Test API connection first
            const apiAvailable = await testAPIConnection();
            
            if (!apiAvailable) {
                console.warn('API not available, saving to sessionStorage only');
                saveToSessionStorage(section, data);
                return true;
            }
            
            // Try to save to API first
            const response = await fetch(`${API_BASE_URL}/settings/${section}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.status === 401) {
                // Token is invalid or expired
                handleAuthError();
                return false;
            }
            
            if (response.ok) {
                const result = await response.json();
                console.log('Settings saved to API:', result);
                
                if (result.success) {
                    // Also save to sessionStorage as fallback
                    saveToSessionStorage(section, data);
                    return true;
                } else {
                    console.warn('API returned unsuccessful response:', result);
                    saveToSessionStorage(section, data);
                    return true;
                }
            }
            
            // If API endpoint doesn't exist, just save to sessionStorage
            if (response.status === 404) {
                console.warn('Settings API endpoint not found, saving to sessionStorage only');
                saveToSessionStorage(section, data);
                return true;
            }
            
            const errorText = await response.text();
            console.error('API returned error:', response.status, errorText);
            throw new Error('API returned error: ' + response.status);
            
        } catch (error) {
            console.warn('API not available, saving to sessionStorage:', error);
            // Fallback to sessionStorage
            saveToSessionStorage(section, data);
            return true;
        }
    }
    
    // Save button functionality
    const saveButtons = {
        security: document.getElementById('saveSecurity'),
        alerts: document.getElementById('saveAlerts'),
        system: document.getElementById('saveSystem'),
        access: document.getElementById('saveAccess')
    };
    
    Object.keys(saveButtons).forEach(section => {
        if (saveButtons[section]) {
            saveButtons[section].addEventListener('click', function() {
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                this.disabled = true;
                
                saveSettings(section).then(success => {
                    // Restore button state
                    this.innerHTML = originalText;
                    this.disabled = false;
                    
                    if (success) {
                        alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
                    }
                }).catch(error => {
                    // Restore button state on error
                    this.innerHTML = originalText;
                    this.disabled = false;
                    console.error('Error saving settings:', error);
                    alert('Error saving settings. Please try again.');
                });
            });
        }
    });
    
    // Cancel button functionality
    const cancelButtons = {
        security: document.getElementById('cancelSecurity'),
        alerts: document.getElementById('cancelAlerts'),
        system: document.getElementById('cancelSystem'),
        access: document.getElementById('cancelAccess')
    };
    
    Object.keys(cancelButtons).forEach(section => {
        if (cancelButtons[section]) {
            cancelButtons[section].addEventListener('click', function() {
                loadSettings(section);
                alert('Changes discarded');
            });
        }
    });
    
    // Load settings when page loads
    await loadSettings('all');
});