// Toggle sidebar
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            main.classList.toggle('active');
        });
    }
    
    // Responsive sidebar toggle
    const mediaQuery = window.matchMedia('(max-width: 576px)');
    
    function handleMobileChange(e) {
        if (e.matches) {
            sidebar.classList.add('active');
            main.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            main.classList.remove('active');
        }
    }
    
    mediaQuery.addListener(handleMobileChange);
    handleMobileChange(mediaQuery);
    
    // Add event listeners to action buttons
    const actionButtons = document.querySelectorAll('.action-buttons button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.querySelector('i').className;
            const firId = this.closest('tr').querySelector('td:first-child').textContent;
            
            if (action.includes('fa-eye')) {
                console.log(`View FIR: ${firId}`);
                // Implement view functionality
            } else if (action.includes('fa-edit')) {
                console.log(`Edit FIR: ${firId}`);
                // Implement edit functionality
            } else if (action.includes('fa-trash')) {
                console.log(`Delete FIR: ${firId}`);
                // Implement delete functionality
            }
        });
    });
    
    // Pagination functionality
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('active') && !this.disabled) {
                document.querySelector('.pagination-btn.active').classList.remove('active');
                this.classList.add('active');
                // Implement pagination functionality
                console.log(`Page changed to: ${this.textContent}`);
            }
        });
    });
    
    // New FIR button functionality
    const newFirBtn = document.querySelector('.btn-primary');
    if (newFirBtn) {
        newFirBtn.addEventListener('click', function() {
            console.log('Create new FIR');
            // Implement new FIR creation
        });
    }
});