document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    
    // If already logged in, redirect to dashboard
    const existingToken = sessionStorage.getItem('authToken');
    if (existingToken) {
        console.log('Already logged in, redirecting...');
        redirectToDashboard();
        return;
    }

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Login form submitted');

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const loginBtn = this.querySelector('.login-btn');

            if (!email || !password) {
                showError('Please fill all fields');
                return;
            }

            // Add loading state
            const originalBtnHTML = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            loginBtn.disabled = true;
            
            try {
                console.log('Attempting login for:', email);
                
                // API CALL - using the correct endpoint
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                console.log('Response status:', response.status);

                // Handle HTTP errors
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                        console.log('Error response:', errorData);
                    } catch (e) {
                        throw new Error(`Server error: ${response.status} ${response.statusText}`);
                    }
                    throw new Error(errorData.message || `Login failed with status ${response.status}`);
                }

                const responseData = await response.json();
                console.log('Login response:', responseData);

                // Check if response has the expected data
                if (!responseData.token || !responseData.user) {
                    console.error('Invalid response structure:', responseData);
                    throw new Error('Invalid response from server');
                }

                // Store token and user data in sessionStorage
                sessionStorage.setItem('authToken', responseData.token);
                sessionStorage.setItem('user', JSON.stringify(responseData.user));
                
                console.log('Login successful, token stored');
                
                // Success animation
                loginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
                loginBtn.style.background = '#4BB543';
                
                // Redirect to dashboard after a brief delay
                setTimeout(redirectToDashboard, 1500);

            } catch (error) {
                console.error('Login error:', error);
                
                // Specific error message for connection issues
                if (error.message.includes('Failed to fetch') || 
                    error.message.includes('Connection refused') ||
                    error.message.includes('ERR_CONNECTION_REFUSED')) {
                    showError('Cannot connect to server. Please make sure the backend server is running on port 5000.');
                } else {
                    showError(error.message || 'Login failed');
                }
                
                loginBtn.innerHTML = originalBtnHTML;
                loginBtn.disabled = false;
            }
        });
    }

    function redirectToDashboard() {
        console.log('Redirecting to dashboard...');
        // Use absolute path to avoid confusion
        window.location.href = 'FrontEnd/Dashboard/dashboard.html';
    }
    
    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Add shake animation to form
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
});