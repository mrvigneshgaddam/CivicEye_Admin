// Fixed auth-guard.js
function checkAuth() {
    const authToken = sessionStorage.getItem('authToken');
    const userData = sessionStorage.getItem('user');
    
    if (!authToken || !userData) {
        // Redirect to index.html at root level
        window.location.href = '/index.html';
        return null;
    }
    
    try {
        return JSON.parse(userData);
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return null;
    }
}

function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    window.location.href = '/index.html';
}