document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const debugPanel = document.getElementById('debugPanel');
    const debugStatus = document.getElementById('debugStatus');
    const debugResponse = document.getElementById('debugResponse');
    
    // Check if we're in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.classList.add('development');
    }
    
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

        const emailInput = document.getElementById('email');
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
        
        // Update debug panel
        if (debugPanel && debugStatus) {
            debugStatus.textContent = 'Status: Making request...';
            debugResponse.textContent = 'Response: Waiting...';
        }

        try {
            // API CALL
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            // Update debug info
            if (debugStatus) {
                debugStatus.textContent = `Status: ${response.status} ${response.statusText}`;
            }

            const responseData = await response.json().catch(() => ({}));
            
            if (debugResponse) {
                debugResponse.textContent = `Response: ${JSON.stringify(responseData, null, 2)}`;
            }

            if (!response.ok) {
                throw new Error(responseData.message || `Login failed with status ${response.status}`);
            }

            // Check if response has the expected data
            if (!responseData.token) {
                throw new Error('No authentication token received from server');
            }

            localStorage.setItem('authToken', responseData.token);
            
            if (responseData.user) {
                localStorage.setItem('user', JSON.stringify(responseData.user));
            }

            // Success animation
            loginBtn.innerHTML = '<i class="fas fa-check"></i>';
            loginBtn.style.backgroundColor = '#4BB543';
            setTimeout(redirectToDashboard, 800);

        } catch (error) {
            console.error('API error:', error.message);
            
            // More specific error messages
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please check if the server is running on localhost:5000';
            } else if (error.message.includes('status 500')) {
                errorMessage = 'Server error. Please check your server logs for more details.';
            } else if (error.message.includes('status 401')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('status 404')) {
                errorMessage = 'Login endpoint not found. Please check your server routes.';
            }
            
            showError(loginForm, errorMessage);
            loginBtn.innerHTML = originalBtnHTML;
            loginBtn.style.backgroundColor = '';
            loginBtn.disabled = false;
        }
    });

    function redirectToDashboard() {
        // Check if dashboard exists, if not show error
        fetch('FrontEnd/Dashboard/dashboard.html')
            .then(response => {
                if (response.ok) {
                    window.location.href = 'FrontEnd/Dashboard/dashboard.html';
                } else {
                    showError(loginForm, 'Dashboard page not found. Please check your file structure.');
                    const loginBtn = document.querySelector('.login-btn');
                    if (loginBtn) {
                        loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
                        loginBtn.disabled = false;
                    }
                }
            })
            .catch(error => {
                console.error('Redirect error:', error);
                showError(loginForm, 'Cannot redirect to dashboard. Please check your file structure.');
            });
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
