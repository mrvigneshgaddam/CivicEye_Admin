document.addEventListener('DOMContentLoaded', function() {
    const $ = s => document.querySelector(s);
    const safe = v => (v === null || v === undefined)? '' : String(v);
    // Fetch profile details of logged-in officer
    fetch('/api/profile', { credentials: 'include' })
        .then(r => r.json())
        .then(resp => {
            const p = resp.data || {};
            if (p) {
                $('#profileName')?.textContent = p.name || '';
                $('#profileRank')?.textContent = p.rank || '';
                $('#profileDepartment')?.textContent = p.department || '';
                $('#profileEmail')?.textContent = p.email || '';
                $('#profilePhone')?.textContent = p.phone || '';
                $('#profileBadge')?.textContent = p.badgeId || '';
                $('#profileOfficerId')?.textContent = p.officerId || '';
                $('#profileStation')?.textContent = p.policeStation || '';
                $('#profileStatus')?.textContent = p.status || '';
                $('#profileAssignedCases')?.textContent = (p.assignedCases !== undefined && p.assignedCases !== null) ? p.assignedCases : '';
                $('#profileAssignedReports')?.textContent = Array.isArray(p.assignedReports) ? p.assignedReports.join(', ') : (p.assignedReports || '');
                
                const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name || '')}`;
                const altText = safe(p.name);

                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) {
                    profileAvatar.src = avatarUrl;
                    profileAvatar.alt = altText;
                }
                const headerAvatar = document.getElementById('headerAvatar');
                if (headerAvatar) {
                    headerAvatar.src = avatarUrl;
                    headerAvatar.alt = altText;
                }
            }
        })
        .catch(err => console.error('Profile fetch error', err));
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