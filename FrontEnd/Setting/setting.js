document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Toggle password visibility
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength indicator
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const strengthMeter = this.closest('.form-group').querySelector('.strength-meter');
            const strengthText = this.closest('.form-group').querySelector('.strength-text');
            const strengthBars = strengthMeter.querySelectorAll('.strength-bar');
            
            // Reset all bars
            strengthBars.forEach(bar => {
                bar.style.backgroundColor = '#eee';
            });
            
            // Calculate password strength (simplified example)
            const password = this.value;
            let strength = 0;
            
            if (password.length > 0) strength = 1;
            if (password.length >= 6) strength = 2;
            if (password.length >= 8 && /[A-Z]/.test(password)) strength = 3;
            if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength = 4;
            
            // Update strength meter
            for (let i = 0; i < strength; i++) {
                strengthBars[i].style.backgroundColor = i < 2 ? '#ef233c' : i < 4 ? '#f8961e' : '#2ecc71';
            }
            
            // Update strength text
            strengthText.textContent = 
                strength === 0 ? '' :
                strength === 1 ? 'Very Weak' :
                strength === 2 ? 'Weak' :
                strength === 3 ? 'Medium' : 'Strong';
            strengthText.style.color = 
                strength < 2 ? '#ef233c' :
                strength < 4 ? '#f8961e' : '#2ecc71';
        });
    }

    // Delete account modal
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const deleteAccountButtons = document.querySelectorAll('[data-action="delete-account"]');
    const closeDeleteAccountModal = document.getElementById('closeDeleteAccountModal');
    const cancelDeleteAccount = document.getElementById('cancelDeleteAccount');
    const confirmDeleteAccount = document.getElementById('confirmDeleteAccount');

    deleteAccountButtons.forEach(button => {
        button.addEventListener('click', () => {
            deleteAccountModal.classList.add('show');
        });
    });

    if (closeDeleteAccountModal) {
        closeDeleteAccountModal.addEventListener('click', () => {
            deleteAccountModal.classList.remove('show');
        });
    }

    if (cancelDeleteAccount) {
        cancelDeleteAccount.addEventListener('click', () => {
            deleteAccountModal.classList.remove('show');
        });
    }

    if (confirmDeleteAccount) {
        confirmDeleteAccount.addEventListener('click', () => {
            // Here you would typically handle account deletion
            alert('Account deletion functionality would be implemented here');
            deleteAccountModal.classList.remove('show');
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    });

    // Form submission handlers
    const forms = document.querySelectorAll('.settings-form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you would typically handle form submission to the server
            alert('Settings saved successfully!');
        });
    });

    // Theme preview functionality
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // In a real implementation, this would change the actual theme
            console.log('Theme changed to:', this.value);
        });
    });

    // Color scheme preview functionality
    const colorRadios = document.querySelectorAll('input[name="color"]');
    colorRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // In a real implementation, this would change the color scheme
            console.log('Color scheme changed to:', this.value);
        });
    });

    // Font size preview functionality
    const fontSizeRadios = document.querySelectorAll('input[name="font-size"]');
    fontSizeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // In a real implementation, this would change the font size
            console.log('Font size changed to:', this.value);
        });
    });
});