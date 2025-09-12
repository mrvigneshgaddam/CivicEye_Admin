// FrontEnd/pages/profile.js

// DEBUG: Check sessionStorage status first
console.log('=== PROFILE.JS LOADED ===');
console.log('Token on load:', sessionStorage.getItem('authToken'));
console.log('User on load:', sessionStorage.getItem('user'));

const API_BASE_URL = 'http://localhost:5000';

// Authentication check function (only checks, doesn't redirect)
function checkAuth() {
    const authToken = sessionStorage.getItem('authToken');
    const userData = sessionStorage.getItem('user');
    
    console.log('checkAuth - Token exists:', !!authToken);
    console.log('checkAuth - User exists:', !!userData);
    
    if (!authToken || !userData) {
        console.warn('Authentication failed: Missing token or user data');
        return null;
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        return user;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Redirect function with delay for debugging
function redirectToLogin() {
    console.log('Redirecting to login page...');
    console.trace('Redirect stack trace');
    
    // Add delay to see console messages
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 2000);
}

// API utility function
async function api(url, options = {}) {
    try {
        // Check authentication first
        const authToken = sessionStorage.getItem('authToken');
        const userData = sessionStorage.getItem('user');
        
        console.log('API call - Token exists:', !!authToken);
        console.log('API call - User exists:', !!userData);
        
        if (!authToken || !userData) {
            console.warn('API call blocked: Not authenticated');
            redirectToLogin();
            return { ok: false, error: 'Not authenticated' };
        }

        const fullUrl = `${API_BASE_URL}${url}`;
        console.log('Making API call to:', fullUrl);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        };

        const response = await fetch(fullUrl, { ...defaultOptions, ...options });
        
        // Handle unauthorized (token expired)
        if (response.status === 401) {
            console.warn('Token expired or invalid (401), redirecting to login');
            logout();
            return { ok: false, error: 'Unauthorized' };
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        return {
            ok: response.ok,
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error('API call error:', error);
        return { ok: false, error: error.message };
    }
}

// Logout function
function logout() {
    console.log('Logging out - clearing session storage');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    redirectToLogin();
}

// Make logout function available globally
window.logout = logout;

// Modal functionality setup
function setupModalFunctionality() {
    console.log('Setting up modal functionality...');
    
    const editProfileBtn = document.getElementById('editProfileBtn');
    const closeEditProfileModal = document.getElementById('closeEditProfileModal');
    const cancelEditProfile = document.getElementById('cancelEditProfile');
    const editProfileModal = document.getElementById('editProfileModal');
    const profileForm = document.getElementById('profileForm');

    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', function() {
            editProfileModal.classList.add('show');
        });
    }

    if (closeEditProfileModal && editProfileModal) {
        closeEditProfileModal.addEventListener('click', function() {
            editProfileModal.classList.remove('show');
        });
    }

    if (cancelEditProfile && editProfileModal) {
        cancelEditProfile.addEventListener('click', function() {
            editProfileModal.classList.remove('show');
        });
    }

    if (editProfileModal) {
        window.addEventListener('click', function(event) {
            if (event.target === editProfileModal) {
                editProfileModal.classList.remove('show');
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('fullName')?.value,
                email: document.getElementById('email')?.value,
                phone: document.getElementById('phone')?.value,
                policeStation: document.getElementById('station')?.value
            };
            
            try {
                // Send update request to backend
                const result = await api('/api/profile/update', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                
                if (result.ok && result.data.success) {
                    alert('Profile updated successfully!');
                    if (editProfileModal) editProfileModal.classList.remove('show');
                    // Reload the page to show updated data
                    location.reload();
                } else {
                    alert('Failed to update profile: ' + (result.data?.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Update error:', error);
                alert('Error updating profile');
            }
        });
    }

    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', function() {
            alert('Avatar edit functionality would open a file picker in a real implementation');
        });
    }
}

// Main DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded - Starting authentication check...');
    
    // Check authentication first
    const user = checkAuth();
    console.log('Authentication check result:', user);
    
    if (!user) {
        console.log('User not authenticated, redirecting to login...');
        redirectToLogin();
        return;
    }

    console.log('User authenticated, proceeding with profile loading...');
    
    const $ = s => document.querySelector(s);
    const safe = v => (v === null || v === undefined) ? '' : String(v);

    // Show loading state
    const loadingIndicator = document.getElementById('loadingIndicator');
    const profileContent = document.getElementById('profileContent');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (profileContent) profileContent.style.display = 'none';

    try {
        // Fetch profile data from your backend API
        console.log('Fetching profile data from API...');
        const result = await api('/api/profile');
        console.log('API result:', result);
        
        if (result.ok && result.data?.success) {
            const p = result.data.data;
            console.log('Profile data from MongoDB:', p);
            
            // Update profile fields with data from MongoDB
            $('#profileName') && ($('#profileName').textContent = safe(p.name) || '');
            $('#profileRank') && ($('#profileRank').textContent = safe(p.rank) || '');
            $('#profileDepartment') && ($('#profileDepartment').textContent = safe(p.department) || '');
            $('#profileEmail') && ($('#profileEmail').textContent = safe(p.email) || '');
            $('#profilePhone') && ($('#profilePhone').textContent = safe(p.phone) || '');
            $('#profileBadge') && ($('#profileBadge').textContent = safe(p.badgeId) || '');
            $('#profileOfficerId') && ($('#profileOfficerId').textContent = safe(p.officerId) || '');
            $('#profileStation') && ($('#profileStation').textContent = safe(p.policeStation) || '');
            $('#profileStatus') && ($('#profileStatus').textContent = safe(p.status) || '');
            $('#profileAssignedCases') && ($('#profileAssignedCases').textContent = safe(p.assignedCases) || '0');

            // Generate avatar
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name || 'User')}`;
            const altText = safe(p.name);

            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
                profileAvatar.src = avatarUrl;
                profileAvatar.alt = altText;
            }
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                headerAvatar.src = avatarUrl;
                headerAvatar.alt = altText;
            }

            // Hide loading, show content
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';

        } else {
            console.error('Profile fetch failed:', result);
            
            // Check if it's an authentication error
            if (result.status === 401) {
                alert('Session expired. Please login again.');
                logout();
                return;
            }
            
            alert('Failed to load profile data: ' + (result.data?.message || 'Unknown error'));
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';
        }
    } catch (err) {
        console.error('Profile fetch error:', err);
        alert('Error loading profile data: ' + err.message);
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
    }

    // Modal functionality
    setupModalFunctionality();
});

// Additional debug info
console.log('Final check - Token:', sessionStorage.getItem('authToken'));
console.log('Final check - User:', sessionStorage.getItem('user'));

// Debug sessionStorage every second
let debugInterval = setInterval(() => {
    console.log('SessionStorage debug - Token:', sessionStorage.getItem('authToken'));
    console.log('SessionStorage debug - User:', sessionStorage.getItem('user'));
}, 1000);

// Stop debugging after 10 seconds
setTimeout(() => {
    clearInterval(debugInterval);
    console.log('Stopped sessionStorage debugging');
}, 10000);