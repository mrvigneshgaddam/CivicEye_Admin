// document.addEventListener('DOMContentLoaded', function() {
//     const sidebar = document.querySelector('.sidebar');
//     const main = document.querySelector('.main');
//     const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    
//     if (sidebarCollapseBtn) {
//         sidebarCollapseBtn.addEventListener('click', function() {
//             sidebar.classList.toggle('active');
//             main.classList.toggle('active');
//         });
//     }
    
//     // Responsive sidebar toggle
//     const mediaQuery = window.matchMedia('(max-width: 576px)');
    
//     function handleMobileChange(e) {
//         if (e.matches) {
//             sidebar.classList.add('active');
//             main.classList.add('active');
//         } else {
//             sidebar.classList.remove('active');
//             main.classList.remove('active');
//         }
//     }
    
//     mediaQuery.addListener(handleMobileChange);
//     handleMobileChange(mediaQuery);
    
//     // Fetch and display FIR data
//     fetchFIRData();
//     // fetchFIRStats(); // Comment this out until you implement the endpoint
    
//     // Search functionality
//     const searchInputs = document.querySelectorAll('.search-box input');
//     searchInputs.forEach(input => {
//         input.addEventListener('keyup', debounce(function() {
//             fetchFIRData(1, this.value);
//         }, 300));
//     });
    
//     // New FIR button functionality
//     const newFirBtn = document.querySelector('.btn-primary');
//     if (newFirBtn) {
//         newFirBtn.addEventListener('click', function() {
//             window.location.href = '/FrontEnd/FIRManagement/CreateFIR.html';
//         });
//     }
    
//     // Filter button functionality
//     const filterBtn = document.querySelector('.btn-secondary:nth-child(2)');
//     if (filterBtn) {
//         filterBtn.addEventListener('click', function() {
//             const status = prompt('Filter by status (Pending, In Progress, Resolved, Urgent) or leave empty for all:');
//             if (status !== null) {
//                 fetchFIRData(1, '', status);
//             }
//         });
//     }
// });

// // Function to fetch FIR data
// async function fetchFIRData(page = 1, search = '', status = '') {
//   try {
//     showLoadingState();
    
//     // Remove the proxy and call your API directly
//     let url = `http://localhost:5000/api/fir?page=${page}&limit=5`;
//     if (search) url += `&search=${encodeURIComponent(search)}`;
//     if (status) url += `&status=${encodeURIComponent(status)}`;
    
//     console.log('Fetching from:', url);
    
//     const response = await fetch(url, {
//       headers: {
//         'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
//       }
//     });
    
//     // Rest of your code...
//   } catch (error) {
//     console.error('Error:', error);
//     showError('Failed to load FIR data. Please try again.');
//   } finally {
//     hideLoadingState();
//   }
// }
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
    
    // Fetch and display FIR data
    fetchFIRData();
    fetchFIRStats();
    
    // Search functionality
    const searchInputs = document.querySelectorAll('.search-box input');
    searchInputs.forEach(input => {
        input.addEventListener('keyup', debounce(function() {
            fetchFIRData(1, this.value);
        }, 300));
    });
    
    // New FIR button functionality
    const newFirBtn = document.querySelector('.btn-primary');
    if (newFirBtn) {
        newFirBtn.addEventListener('click', function() {
            window.location.href = '/FrontEnd/FIRManagement/CreateFIR.html';
        });
    }
    
    // Filter button functionality
    const filterBtn = document.querySelector('.btn-secondary:nth-child(2)');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            const status = prompt('Filter by status (Pending, In Progress, Resolved, Urgent) or leave empty for all:');
            if (status !== null) {
                fetchFIRData(1, '', status);
            }
        });
    }
});

// Function to fetch FIR data
async function fetchFIRData(page = 1, search = '', status = '') {
  try {
    showLoadingState();
    
    let url = `http://localhost:5000/api/fir?page=${page}&limit=5`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response:', data);
    
    // Handle different response formats
    if (data.success && data.data) {
      // Standard format: {success: true, data: [...], pagination: {...}}
      populateFIRTable(data.data);
      if (data.pagination) {
        updatePagination(data.pagination);
      }
    } else if (Array.isArray(data)) {
      // Direct array format: [...]
      populateFIRTable(data);
      // You might need to implement custom pagination logic here
      const tableInfo = document.querySelector('.table-info');
      tableInfo.textContent = `Showing ${data.length} entries`;
    } else {
      throw new Error(data.message || 'Unexpected API response format');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to load FIR data. Please try again.');
  } finally {
    hideLoadingState();
  }
}

// Rest of your functions remain the same...
// Function to fetch FIR statistics
async function fetchFIRStats() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('http://localhost:5000/api/fir/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch FIR statistics');
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      updateStatsCards(data.data);
    } else {
      console.warn('Unexpected stats response format:', data);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Function to populate the FIR table
function populateFIRTable(reports) {
  const tbody = document.querySelector('.data-table tbody');
  tbody.innerHTML = '';
  
  if (!reports || !Array.isArray(reports)) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="no-data">No FIR data available</td>
      </tr>
    `;
    return;
  }
  
  reports.forEach(report => {
    const row = document.createElement('tr');
    
    // Map API fields to frontend expected fields
    const firId = report.firId || report._id || 'N/A';
    const complainantName = report.name || report.complainant?.name || 'Unknown';
    const incidentType = report.crimeType || report.incidentType || 'Unknown';
    const location = report.location || report.incidentLocation || 'Unknown';
    const status = report.status || 'Pending';
    const assignedOfficer = report.assignedOfficer || report.assignedTo || 'Unassigned';
    const incidentDateTime = report.incidentDateTime || report.date || new Date();
    
    // Format date safely
    let incidentDate = 'Unknown';
    try {
      incidentDate = new Date(incidentDateTime).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    // Get status class for styling
    let statusClass = status.toLowerCase().replace(' ', '-');
    if (statusClass === 'in-progress') statusClass = 'in-progress';
    
    row.innerHTML = `
      <td>${firId}</td>
      <td>${complainantName}</td>
      <td>${incidentType}</td>
      <td>${location}</td>
      <td>${incidentDate}</td>
      <td><span class="status-badge ${statusClass}">${status}</span></td>
      <td>${assignedOfficer}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small" data-action="view" data-id="${report._id}"><i class="fas fa-eye"></i></button>
          <button class="btn-icon small" data-action="edit" data-id="${report._id}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon small" data-action="delete" data-id="${report._id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Add event listeners to action buttons
  attachActionListeners();
}

// Function to update statistics cards
function updateStatsCards(stats) {
    document.querySelectorAll('.stats-card h2')[0].textContent = stats.total;
    document.querySelectorAll('.stats-card h2')[1].textContent = stats.pending;
    document.querySelectorAll('.stats-card h2')[2].textContent = stats.resolved;
    document.querySelectorAll('.stats-card h2')[3].textContent = stats.urgent;
}

// Function to update pagination
function updatePagination(pagination) {
    const paginationContainer = document.querySelector('.pagination');
    const tableInfo = document.querySelector('.table-info');
    
    // Update table info
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(start + pagination.itemsPerPage - 1, pagination.totalItems);
    tableInfo.textContent = `Showing ${start} to ${end} of ${pagination.totalItems} entries`;
    
    // Update pagination buttons
    paginationContainer.innerHTML = `
        <button class="pagination-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} data-page="${pagination.currentPage - 1}">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Add page number buttons
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || 
            (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            paginationContainer.innerHTML += `
                <button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        } else if (i === pagination.currentPage - 2 || i === pagination.currentPage + 2) {
            paginationContainer.innerHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Next button
    paginationContainer.innerHTML += `
        <button class="pagination-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} data-page="${pagination.currentPage + 1}">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    // Add event listeners to pagination buttons
    attachPaginationListeners();
}

// Function to attach pagination listeners
function attachPaginationListeners() {
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.disabled) {
                const page = parseInt(this.getAttribute('data-page'));
                const searchValue = document.querySelector('.search-box.small input').value;
                const statusFilter = ''; // You can implement status filtering
                
                fetchFIRData(page, searchValue, statusFilter);
            }
        });
    });
}

// Function to attach action listeners
function attachActionListeners() {
    const actionButtons = document.querySelectorAll('.action-buttons button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const reportId = this.getAttribute('data-id');
            
            if (action === 'view') {
                viewFIR(reportId);
            } else if (action === 'edit') {
                editFIR(reportId);
            } else if (action === 'delete') {
                deleteFIR(reportId);
            }
        });
    });
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Loading state functions
function showLoadingState() {
    // Add loading spinner to table
    const tbody = document.querySelector('.data-table tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Loading FIR data...</span>
            </td>
        </tr>
    `;
}

function hideLoadingState() {
    // Remove loading spinner
    const loadingCell = document.querySelector('.loading-cell');
    if (loadingCell) {
        loadingCell.remove();
    }
}

// Error display function
function showError(message) {
    const tableContainer = document.querySelector('.table-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    tableContainer.appendChild(errorDiv);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Placeholder functions for actions
function viewFIR(reportId) {
    console.log(`View FIR: ${reportId}`);
    // Implement view functionality - open modal or navigate to detail page
    window.location.href = `/FrontEnd/FIRManagement/ViewFIR.html?id=${reportId}`;
}

function editFIR(reportId) {
    console.log(`Edit FIR: ${reportId}`);
    // Implement edit functionality
    window.location.href = `/FrontEnd/FIRManagement/EditFIR.html?id=${reportId}`;
}

function deleteFIR(reportId) {
    console.log(`Delete FIR: ${reportId}`);
    // Implement delete functionality with confirmation
    if (confirm('Are you sure you want to delete this FIR? This action cannot be undone.')) {
        // Make API call to delete the FIR
        deleteFIRFromAPI(reportId);
    }
}

async function deleteFIRFromAPI(reportId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost:5000/api/fir/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Refresh the data
            fetchFIRData();
            fetchFIRStats();
        } else {
            throw new Error('Failed to delete FIR');
        }
    } catch (error) {
        console.error('Error deleting FIR:', error);
        showError('Failed to delete FIR. Please try again.');
    }
}