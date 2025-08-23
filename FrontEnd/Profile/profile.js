document.addEventListener('DOMContentLoaded', function() {
    // Toggle edit profile modal
    const editProfileBtn = document.getElementById('editProfileBtn');
    const closeEditProfileModal = document.getElementById('closeEditProfileModal');
    const cancelEditProfile = document.getElementById('cancelEditProfile');
    const editProfileModal = document.getElementById('editProfileModal');
    const profileForm = document.getElementById('profileForm');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            editProfileModal.classList.add('show');
        });
    }

    if (closeEditProfileModal) {
        closeEditProfileModal.addEventListener('click', function() {
            editProfileModal.classList.remove('show');
        });
    }

    if (cancelEditProfile) {
        cancelEditProfile.addEventListener('click', function() {
            editProfileModal.classList.remove('show');
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === editProfileModal) {
            editProfileModal.classList.remove('show');
        }
    });

    // Form submission
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you would typically handle form submission to the server
            alert('Profile updated successfully!');
            editProfileModal.classList.remove('show');
        });
    }

    // Edit avatar button
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', function() {
            alert('Avatar edit functionality would open a file picker in a real implementation');
        });
    }
});