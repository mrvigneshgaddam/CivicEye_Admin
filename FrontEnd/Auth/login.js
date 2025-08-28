async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.token) {
    const msg = data?.message || 'Login failed';
    // show an inline error next to your form
    document.getElementById('loginError').textContent = msg;
    return;
  }

  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  // redirect to dashboard (or wherever you go after login)
  window.location.href = '/FrontEnd/Dashboard/dashboard.html';
}