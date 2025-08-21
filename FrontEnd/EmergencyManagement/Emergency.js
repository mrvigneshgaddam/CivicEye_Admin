document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const emergencySearch = document.getElementById('emergencySearch');
    const emergencyStatusFilter = document.getElementById('emergencyStatusFilter');
    const emergencyTypeFilter = document.getElementById('emergencyTypeFilter');
    const dispatchTeamBtn = document.getElementById('dispatchTeamBtn');
    const sendAlertBtn = document.getElementById('sendAlertBtn');
    const emergencyModal = document.getElementById('emergencyModal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const viewButtons = document.querySelectorAll('.action-btn.view');

    // Event Listeners
    emergencySearch.addEventListener('input', filterEmergencies);
    emergencyStatusFilter.addEventListener('change', filterEmergencies);
    emergencyTypeFilter.addEventListener('change', filterEmergencies);
    dispatchTeamBtn.addEventListener('click', dispatchTeam);
    sendAlertBtn.addEventListener('click', sendPublicAlert);
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    
    // Attach view buttons
    viewButtons.forEach(btn => {
        btn.addEventListener('click', viewEmergencyDetails);
    });

    // Functions
    function filterEmergencies() {
        const searchTerm = emergencySearch.value.toLowerCase();
        const statusFilter = emergencyStatusFilter.value;
        const typeFilter = emergencyTypeFilter.value;
        
        const rows = document.querySelectorAll('.emergency-table tbody tr');
        
        rows.forEach(row => {
            const emergencyId = row.cells[0].textContent.toLowerCase();
            const emergencyType = row.querySelector('.emergency-type').textContent.toLowerCase();
            const location = row.cells[2].textContent.toLowerCase();
            const status = row.querySelector('.emergency-status').textContent.toLowerCase().replace(' ', '_');
            const type = row.querySelector('.emergency-type').textContent.toLowerCase().replace(' ', '_');
            
            const matchesSearch = emergencyId.includes(searchTerm) || 
                                emergencyType.includes(searchTerm) || 
                                location.includes(searchTerm);
            
            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesType = typeFilter === 'all' || type === typeFilter;
            
            if (matchesSearch && matchesStatus && matchesType) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function viewEmergencyDetails() {
        // In a real app, you would fetch the emergency details based on ID
        emergencyModal.style.display = 'flex';
    }

    function dispatchTeam() {
        alert('Dispatch team functionality would be implemented here');
    }

    function sendPublicAlert() {
        alert('Public alert functionality would be implemented here');
    }

    function closeModal() {
        emergencyModal.style.display = 'none';
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === emergencyModal) {
            closeModal();
        }
    });
});