document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    
    if (!loginForm || !togglePassword || !passwordInput) {
        console.error('Required login form elements not found');
        return;
    }
    
    // Already logged in? Redirect
    if (localStorage.getItem('authToken')) {
        redirectToDashboard();
        return;
    }

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
    
    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');  // ✅ matches HTML
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) {
            showError(loginForm, 'Form elements not found');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const loginBtn = this.querySelector('.login-btn');

        if (!email || !password) {
            showError(loginForm, 'Please fill all fields');
            return;
        }

        // Add loading state
        const originalBtnHTML = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        loginBtn.disabled = true;

        try {
            // API CALL
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }) // ✅ backend expects email
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Success animation
            loginBtn.innerHTML = '<i class="fas fa-check"></i>';
            loginBtn.style.backgroundColor = '#4BB543';
            setTimeout(redirectToDashboard, 800);

        } catch (error) {
            console.warn('API error:', error.message);
            showError(loginForm, error.message);
            loginBtn.innerHTML = originalBtnHTML;
            loginBtn.style.backgroundColor = '';
            loginBtn.disabled = false;
        }
    });

    function redirectToDashboard() {
        window.location.href = 'FrontEnd/Dashboard/dashboard.html';
    }
    
    function showError(form, message) {
        const existingError = form.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        errorEl.style.cssText = `
            color: #ef233c;
            margin-top: 10px;
            text-align: center;
            animation: fadeIn 0.3s ease-out;
            padding: 8px;
            background: #fee;
            border-radius: 4px;
            border: 1px solid #fcc;
        `;

        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 500);
        
        form.appendChild(errorEl);
        
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => errorEl.remove(), 300);
            }
        }, 5000);
    }
});
