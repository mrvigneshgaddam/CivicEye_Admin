// FrontEnd/shared/auth-guard.js
(function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : 'http://localhost:5000';

  const isLoginPage =
    document.documentElement.getAttribute('data-page') === 'login' ||
    /(^\/$|\/index\.html$)/i.test(location.pathname);

  // Check if we have a token in localStorage first
  function hasLocalToken() {
    return !!localStorage.getItem('authToken');
  }

  async function isAuthed() {
    // First check localStorage to avoid unnecessary API calls
    if (!hasLocalToken()) return false;
    
    try {
      const res = await fetch(API_BASE + '/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.ok;
    } catch { 
      return false; 
    }
  }

  (async () => {
    // Add a small delay to ensure proper page load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (isLoginPage) {
      if (await isAuthed()) {
        location.replace('/FrontEnd/Dashboard/dashboard.html');
      }
      return;
    }
    
    if (!(await isAuthed())) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      location.replace('/index.html');
    }
  })();
})();