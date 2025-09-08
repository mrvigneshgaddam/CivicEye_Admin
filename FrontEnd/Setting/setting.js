// FrontEnd/Setting/setting.js
document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    let authToken = localStorage.getItem('authToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    console.log('Auth Token exists:', !!authToken);
    console.log('Current User:', currentUser);

    // ✅ Enhanced authentication with backend validation
    async function isAuthenticated() {
        const token = localStorage.getItem('authToken');

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
                localStorage.removeItem("authToken");
                localStorage.removeItem("currentUser");
                return false;
            }

            const data = await res.json();

            if (data.success && data.police) {
                localStorage.setItem("currentUser", JSON.stringify(data.police));
                currentUser = data.police;
                return true;
            } else {
                console.warn("User data missing, clearing token");
                localStorage.removeItem("authToken");
                localStorage.removeItem("currentUser");
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
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });
    
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
    
    // Load settings from backend or localStorage
    async function loadSettings(section = 'all') {
        try {
            // Test API connection first
            const apiAvailable = await testAPIConnection();
            
            if (!apiAvailable) {
                console.warn('API not available, using localStorage');
                loadSettingsFromLocalStorage(section);
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
                console.warn('Settings endpoint not found, using localStorage');
                loadSettingsFromLocalStorage(section);
                return;
            }
            
            throw new Error(`Failed to fetch settings: ${response.status}`);
            
        } catch (error) {
            console.warn('Error loading settings, falling back to localStorage:', error);
            // Fallback to localStorage if API fails
            loadSettingsFromLocalStorage(section);
        }
    }
    
    // Handle authentication errors
    function handleAuthError() {
        alert('Your session has expired. Please login again.');
        // Clear stored auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        // Redirect to login page with correct path
        window.location.href = '/index.html';
    }
    
    // Load settings from localStorage
    function loadSettingsFromLocalStorage(section = 'all') {
        console.log('Loading settings from localStorage for section:', section);
        
        const sections = section === 'all' ? ['security', 'alerts', 'system', 'access'] : [section];
        
        sections.forEach(sec => {
            // Security settings
            if (sec === 'security' || sec === 'all') {
                if (localStorage.getItem('require2FA') !== null) {
                    document.getElementById('require2FA').checked = 
                        localStorage.getItem('require2FA') === 'true';
                }
                
                if (localStorage.getItem('strongPasswords') !== null) {
                    document.getElementById('strongPasswords').checked = 
                        localStorage.getItem('strongPasswords') === 'true';
                }
                
                if (localStorage.getItem('sessionTimeout') !== null) {
                    document.getElementById('session-timeout').value = 
                        localStorage.getItem('sessionTimeout');
                }
                
                if (localStorage.getItem('loginAttempts') !== null) {
                    document.getElementById('login-attempts').value = 
                        localStorage.getItem('loginAttempts');
                }
                
                if (localStorage.getItem('ipWhitelisting') !== null) {
                    document.getElementById('ipWhitelisting').checked = 
                        localStorage.getItem('ipWhitelisting') === 'true';
                }
            }
            
            // Alert settings
            if (sec === 'alerts' || sec === 'all') {
                if (localStorage.getItem('emergencyAlerts') !== null) {
                    document.getElementById('emergencyAlerts').checked = 
                        localStorage.getItem('emergencyAlerts') === 'true';
                }
                
                if (localStorage.getItem('firUpdates') !== null) {
                    document.getElementById('firUpdates').checked = 
                        localStorage.getItem('firUpdates') === 'true';
                }
                
                if (localStorage.getItem('officerActivities') !== null) {
                    document.getElementById('officerActivities').checked = 
                        localStorage.getItem('officerActivities') === 'true';
                }
                
                if (localStorage.getItem('emailAlerts') !== null) {
                    document.getElementById('emailAlerts').checked = 
                        localStorage.getItem('emailAlerts') === 'true';
                }
                
                if (localStorage.getItem('smsAlerts') !== null) {
                    document.getElementById('smsAlerts').checked = 
                        localStorage.getItem('smsAlerts') === 'true';
                }
                
                if (localStorage.getItem('pushAlerts') !== null) {
                    document.getElementById('pushAlerts').checked = 
                        localStorage.getItem('pushAlerts') === 'true';
                }
            }
            
            // System settings
            if (sec === 'system' || sec === 'all') {
                if (localStorage.getItem('backupFrequency') !== null) {
                    document.getElementById('backup-frequency').value = 
                        localStorage.getItem('backupFrequency');
                }
                
                if (localStorage.getItem('logRetention') !== null) {
                    document.getElementById('log-retention').value = 
                        localStorage.getItem('logRetention');
                }
                
                if (localStorage.getItem('autoUpdates') !== null) {
                    document.getElementById('autoUpdates').checked = 
                        localStorage.getItem('autoUpdates') === 'true';
                }
                
                if (localStorage.getItem('maintenanceWindow') !== null) {
                    document.getElementById('maintenance-window').value = 
                        localStorage.getItem('maintenanceWindow');
                }
            }
            
            // Access control settings
            if (sec === 'access' || sec === 'all') {
                if (localStorage.getItem('adminPrivileges') !== null) {
                    document.getElementById('admin-privileges').value = 
                        localStorage.getItem('adminPrivileges');
                }
                
                if (localStorage.getItem('exportPermissions') !== null) {
                    document.getElementById('exportPermissions').checked = 
                        localStorage.getItem('exportPermissions') === 'true';
                }
                
                if (localStorage.getItem('activityMonitoring') !== null) {
                    document.getElementById('activityMonitoring').checked = 
                        localStorage.getItem('activityMonitoring') === 'true';
                }
                
                if (localStorage.getItem('loginAuditing') !== null) {
                    document.getElementById('loginAuditing').checked = 
                        localStorage.getItem('loginAuditing') === 'true';
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
                    document.getElementById('require2FA').checked = settings.security.require2FA || false;
                    document.getElementById('strongPasswords').checked = settings.security.strongPasswords || true;
                    document.getElementById('session-timeout').value = settings.security.sessionTimeout || '30';
                    document.getElementById('login-attempts').value = settings.security.loginAttempts || '5';
                    document.getElementById('ipWhitelisting').checked = settings.security.ipWhitelisting || false;
                }
            }
            
            if (sec === 'alerts' || sec === 'all') {
                if (settings.alerts) {
                    document.getElementById('emergencyAlerts').checked = settings.alerts.emergencyAlerts || true;
                    document.getElementById('firUpdates').checked = settings.alerts.firUpdates || true;
                    document.getElementById('officerActivities').checked = settings.alerts.officerActivities || false;
                    document.getElementById('emailAlerts').checked = settings.alerts.emailAlerts || true;
                    document.getElementById('smsAlerts').checked = settings.alerts.smsAlerts || false;
                    document.getElementById('pushAlerts').checked = settings.alerts.pushAlerts || true;
                }
            }
            
            if (sec === 'system' || sec === 'all') {
                if (settings.system) {
                    document.getElementById('backup-frequency').value = settings.system.backupFrequency || 'weekly';
                    document.getElementById('log-retention').value = settings.system.logRetention || '90';
                    document.getElementById('autoUpdates').checked = settings.system.autoUpdates || true;
                    document.getElementById('maintenance-window').value = settings.system.maintenanceWindow || '02:00-06:00';
                }
            }
            
            if (sec === 'access' || sec === 'all') {
                if (settings.access) {
                    document.getElementById('admin-privileges').value = settings.access.adminPrivileges || 'standard';
                    document.getElementById('exportPermissions').checked = settings.access.exportPermissions || true;
                    document.getElementById('activityMonitoring').checked = settings.access.activityMonitoring || true;
                    document.getElementById('loginAuditing').checked = settings.access.loginAuditing || true;
                }
            }
        });
    }
    
    // Save settings to backend or localStorage
    async function saveSettings(section) {
        const data = collectSectionData(section);
        
        try {
            // Test API connection first
            const apiAvailable = await testAPIConnection();
            
            if (!apiAvailable) {
                console.warn('API not available, saving to localStorage only');
                saveToLocalStorage(section, data);
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
                // Also save to localStorage as fallback
                saveToLocalStorage(section, data);
                return true;
            }
            
            // If API endpoint doesn't exist, just save to localStorage
            if (response.status === 404) {
                console.warn('Settings API endpoint not found, saving to localStorage only');
                saveToLocalStorage(section, data);
                return true;
            }
            
            throw new Error('API returned error: ' + response.status);
            
        } catch (error) {
            console.warn('API not available, saving to localStorage:', error);
            // Fallback to localStorage
            saveToLocalStorage(section, data);
            return true;
        }
    }
    
    // Collect data from a section
    function collectSectionData(section) {
        const data = {};
        
        if (section === 'security') {
            data.require2FA = document.getElementById('require2FA').checked;
            data.strongPasswords = document.getElementById('strongPasswords').checked;
            data.sessionTimeout = document.getElementById('session-timeout').value;
            data.loginAttempts = document.getElementById('login-attempts').value;
            data.ipWhitelisting = document.getElementById('ipWhitelisting').checked;
        }
        
        if (section === 'alerts') {
            data.emergencyAlerts = document.getElementById('emergencyAlerts').checked;
            data.firUpdates = document.getElementById('firUpdates').checked;
            data.officerActivities = document.getElementById('officerActivities').checked;
            data.emailAlerts = document.getElementById('emailAlerts').checked;
            data.smsAlerts = document.getElementById('smsAlerts').checked;
            data.pushAlerts = document.getElementById('pushAlerts').checked;
        }
        
        if (section === 'system') {
            data.backupFrequency = document.getElementById('backup-frequency').value;
            data.logRetention = document.getElementById('log-retention').value;
            data.autoUpdates = document.getElementById('autoUpdates').checked;
            data.maintenanceWindow = document.getElementById('maintenance-window').value;
        }
        
        if (section === 'access') {
            data.adminPrivileges = document.getElementById('admin-privileges').value;
            data.exportPermissions = document.getElementById('exportPermissions').checked;
            data.activityMonitoring = document.getElementById('activityMonitoring').checked;
            data.loginAuditing = document.getElementById('loginAuditing').checked;
        }
        
        return data;
    }
    
    // Save settings to localStorage
    function saveToLocalStorage(section, data) {
        if (section === 'security') {
            localStorage.setItem('require2FA', data.require2FA);
            localStorage.setItem('strongPasswords', data.strongPasswords);
            localStorage.setItem('sessionTimeout', data.sessionTimeout);
            localStorage.setItem('loginAttempts', data.loginAttempts);
            localStorage.setItem('ipWhitelisting', data.ipWhitelisting);
        }
        
        if (section === 'alerts') {
            localStorage.setItem('emergencyAlerts', data.emergencyAlerts);
            localStorage.setItem('firUpdates', data.firUpdates);
            localStorage.setItem('officerActivities', data.officerActivities);
            localStorage.setItem('emailAlerts', data.emailAlerts);
            localStorage.setItem('smsAlerts', data.smsAlerts);
            localStorage.setItem('pushAlerts', data.pushAlerts);
        }
        
        if (section === 'system') {
            localStorage.setItem('backupFrequency', data.backupFrequency);
            localStorage.setItem('logRetention', data.logRetention);
            localStorage.setItem('autoUpdates', data.autoUpdates);
            localStorage.setItem('maintenanceWindow', data.maintenanceWindow);
        }
        
        if (section === 'access') {
            localStorage.setItem('adminPrivileges', data.adminPrivileges);
            localStorage.setItem('exportPermissions', data.exportPermissions);
            localStorage.setItem('activityMonitoring', data.activityMonitoring);
            localStorage.setItem('loginAuditing', data.loginAuditing);
        }
        
        console.log(`Settings for ${section} saved to localStorage`);
    }
    
    // Load settings when page loads
    loadSettings('all');
});