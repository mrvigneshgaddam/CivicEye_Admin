// /FrontEnd/shared/auth-guard.js
(function () {
  const path = location.pathname.replace(/\/+$/, '');
  const isLogin =
    path === '' ||
    path === '/' ||
    /\/index\.html$/i.test(path);

  const token = localStorage.getItem('token');

  // If you’re on LOGIN and already have a token → go to dashboard
  if (isLogin && token) {
    location.replace('/FrontEnd/Dashboard/dashboard.html');
    return;
  }

  // If you’re on a PROTECTED page and no token → back to login
  const protectedPaths = [
    '/FrontEnd/Dashboard/dashboard.html',
    '/FrontEnd/FirManagement/FirManagement.html',
    '/FrontEnd/OfficerManagement/OfficerManagement.html',
    '/FrontEnd/EmergencyManagement/Emergency.html',
    '/FrontEnd/Profile/profile.html',
    '/FrontEnd/Setting/setting.html',
  ];

  if (!isLogin && protectedPaths.some(p => p.toLowerCase() === path.toLowerCase())) {
    if (!token) {
      location.replace('/index.html');
    }
  }
})();