import { api } from '../shared/api.js';

document.addEventListener('DOMContentLoaded', async function() {

    const $ = s => document.querySelector(s);
    const safe = v => (v === null || v === undefined) ? '' : String(v);

    try {
        const { ok, data } = await api('/api/profile');
        if (ok && data?.data) {
            const p = data.data;
            console.log('Profile data', p);
            $('#profileName') && ($('#profileName').textContent = safe(p.name) || '');
            $('#profileRank') && ($('#profileRank').textContent = safe(p.rank) || '');
            $('#profileDepartment') && ($('#profileDepartment').textContent = safe(p.department) || '');
            $('#profileEmail') && ($('#profileEmail').textContent = safe(p.email) || '');
            $('#profilePhone')  && ($('#profilePhone').textContent = safe(p.phone) || '');
            $('#profileBadge') && ($('#profileBadge').textContent = safe(p.badgeId) || '');
            $('#profileOfficerId') && ($('#profileOfficerId').textContent = safe(p.officerId) || '');
            $('#profileStation') && ($('#profileStation').textContent = safe(p.policeStation) || '');
            $('#profileStatus') && ($('#profileStatus').textContent = safe(p.status) || '');
            $('#profileAssignedCases') && ($('#profileAssignedCases').textContent = safe(p.assignedCases) || '0');

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
        } else {
            console.error('Profile fetch error', data);
        }
    } catch (err) {
        console.error('Profile fetch error', err);
    }
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