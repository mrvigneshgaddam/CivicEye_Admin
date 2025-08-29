document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            // Validate response before storing
            if (!res.ok || !data.success || !data.token) {
                throw new Error(data.message || 'Invalid email or password');
            }

            // Store token & user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user || {}));

            // Redirect to dashboard
            window.location.href = '/FrontEnd/Dashboard/dashboard.html';
        } catch (err) {
            alert(err.message);
        }
    });
});