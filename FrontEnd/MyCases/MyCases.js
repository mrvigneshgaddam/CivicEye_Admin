/* ==================== CONFIG ==================== */
const API = 'http://localhost:5000/api/fir'; // MyCases = FIR reports
const PAGE_SIZE = 10;

/* ==================== HELPERS ==================== */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const safe = (v, f = '—') => (v === undefined || v === null || v === '') ? f : String(v);
function debounce(fn, t = 300) { let x; return (...a) => { clearTimeout(x); x = setTimeout(() => fn(...a), t); }; }
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—'
    : d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

/* ==================== STATE ==================== */
let allCases = [];
let filtered = [];
let currentPage = 1;

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadCases();

  // Search filters
  const caseSearch = $('#caseSearch');
  if (caseSearch) caseSearch.addEventListener('keyup', debounce(() => applyFilter(caseSearch.value.trim()), 300));

  const statusFilter = $('#caseStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', () => applyFilter(caseSearch?.value || ''));

  const priorityFilter = $('#casePriorityFilter');
  if (priorityFilter) priorityFilter.addEventListener('change', () => applyFilter(caseSearch?.value || ''));

  // Refresh button
  const refreshBtn = $('#refreshCasesBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadCases());

  // Export button
  const exportBtn = $('#exportCasesBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => exportCsv());

  // Modal close
  const modal = $('#caseModal');
  const closeBtn = $('#closeCaseModal');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  // Retry button
  const retryBtn = $('#retryButton');
  if (retryBtn) retryBtn.addEventListener('click', () => loadCases());
});

/* ==================== FETCH CASES ==================== */
async function loadCases(search = '') {
  const tbody = $('#casesTableBody');
  const loadingIndicator = $('#loadingIndicator');
  const errorMessage = $('#errorMessage');
  const caseStats = $('#caseStats');
  const caseActionsBar = $('#caseActionsBar');
  const caseTableContainer = $('#caseTableContainer');
  const pagination = $('#pagination');
  
  if (!tbody) return;

  // Show loading, hide other elements
  loadingIndicator.style.display = 'flex';
  errorMessage.style.display = 'none';
  caseStats.style.display = 'none';
  caseActionsBar.style.display = 'none';
  caseTableContainer.style.display = 'none';
  pagination.style.display = 'none';

  try {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = search 
      ? `${API}?search=${encodeURIComponent(search)}&limit=1000`
      : `${API}?limit=1000`;

    const res = await fetch(url, { headers, credentials: 'include' });
    const payload = await res.json();
    if (!res.ok || !payload.success) throw new Error(payload.message || `HTTP ${res.status}`);

    allCases = Array.isArray(payload.data) ? payload.data : [];
    filtered = [...allCases];
    currentPage = 1;
    
    // Hide loading, show other elements
    loadingIndicator.style.display = 'none';
    caseStats.style.display = 'grid';
    caseActionsBar.style.display = 'flex';
    caseTableContainer.style.display = 'block';
    pagination.style.display = 'flex';
    
    renderStats();
    renderTable();
  } catch (err) {
    // Show error message
    loadingIndicator.style.display = 'none';
    errorMessage.style.display = 'flex';
    
    console.error('Failed to load cases:', err);
  }
}

/* ==================== RENDER ==================== */
function renderStats() {
  $('#totalCases').textContent    = allCases.length;
  $('#pendingCases').textContent  = allCases.filter(c => String(c.status || '').toLowerCase() === 'pending').length;
  $('#inProgressCases').textContent = allCases.filter(c => String(c.status || '').toLowerCase() === 'in_progress').length;
  $('#resolvedCases').textContent = allCases.filter(c => String(c.status || '').toLowerCase() === 'resolved').length;
}

function renderTable() {
  const tbody = $('#casesTableBody');
  tbody.innerHTML = '';

  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">No cases found</td></tr>`;
    return;
  }

  for (const c of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${safe(c.reportId || c._id)}</td>
      <td>${safe(c.title || c.complaint)}</td>
      <td>${safe(c.incidentType)}</td>
      <td>${safe(c.location)}</td>
      <td>${formatDateTime(c.assignedDate || c.createdAt)}</td>
      <td><span class="status-badge status-${String(c.status || 'pending').toLowerCase().replace(' ', '_')}">${safe(c.status)}</span></td>
      <td>${safe(c.priority || 'Medium')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small view-btn" data-id="${c._id}"><i class="fas fa-eye"></i></button>
          <button class="btn-icon small edit-btn" data-id="${c._id}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon small delete-btn" data-id="${c._id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }

  $$('.view-btn').forEach(b => b.addEventListener('click', () => viewCase(b.dataset.id)));
  $$('.edit-btn').forEach(b => b.addEventListener('click', () => editCase(b.dataset.id)));
  $$('.delete-btn').forEach(b => b.addEventListener('click', () => deleteCase(b.dataset.id)));

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pag = $('#paginationPages');
  if (!pag) return;

  pag.innerHTML = '';
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (p === currentPage ? ' active' : '');
    btn.textContent = p;
    btn.addEventListener('click', () => { currentPage = p; renderTable(); });
    pag.appendChild(btn);
  }

  $('#prevPageBtn').disabled = currentPage === 1;
  $('#nextPageBtn').disabled = currentPage === totalPages;

  $('#prevPageBtn').onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  $('#nextPageBtn').onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
}

/* ==================== FILTER ==================== */
function applyFilter(term) {
  const status = ($('#caseStatusFilter')?.value || 'all').toLowerCase();
  const priority = ($('#casePriorityFilter')?.value || 'all').toLowerCase();

  filtered = allCases.filter(c => {
    const blob = [
      c.reportId, c.title, c.complaint, c.incidentType,
      c.location, c.status, c.priority
    ].map(v => String(v ?? '').toLowerCase()).join(' ');

    const matchesTerm = term ? blob.includes(term.toLowerCase()) : true;
    const matchesStatus = status === 'all' || String(c.status || '').toLowerCase() === status;
    const matchesPriority = priority === 'all' || String(c.priority || '').toLowerCase() === priority;

    return matchesTerm && matchesStatus && matchesPriority;
  });

  currentPage = 1;
  renderTable();
}

/* ==================== ACTIONS ==================== */
function viewCase(id) {
  const item = allCases.find(c => String(c._id) === String(id));
  if (!item) return;
  const modal = $('#caseModal');
  const body = $('#caseDetailsContent');
  if (!modal || !body) return;

  body.innerHTML = `
    <h3>Case Details</h3>
    <p><strong>Case ID:</strong> ${safe(item.reportId)}</p>
    <p><strong>Title:</strong> ${safe(item.title || item.complaint)}</p>
    <p><strong>Type:</strong> ${safe(item.incidentType)}</p>
    <p><strong>Location:</strong> ${safe(item.location)}</p>
    <p><strong>Status:</strong> ${safe(item.status)}</p>
    <p><strong>Priority:</strong> ${safe(item.priority)}</p>
    <p><strong>Description:</strong> ${safe(item.description)}</p>
    <p><strong>Assigned Date:</strong> ${formatDateTime(item.assignedDate || item.createdAt)}</p>
  `;
  modal.style.display = 'flex';
}

function editCase(id) {
  alert('Edit case feature coming soon!');
}

async function deleteCase(id) {
  if (!confirm('Are you sure you want to delete this case?')) return;
  try {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers, credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allCases = allCases.filter(c => String(c._id) !== String(id));
    applyFilter('');
    alert('Case deleted successfully!');
  } catch (err) {
    alert(`Failed to delete case: ${err.message}`);
  }
}

/* ==================== EXPORT ==================== */
function exportCsv() {
  if (!filtered.length) return alert('No data to export.');
  const headers = Object.keys(filtered[0]);
  const rows = [headers.join(',')];
  filtered.forEach(r => {
    rows.push(headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cases_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==================== SIDEBAR ==================== */
function setupSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  const btn = document.getElementById('sidebarCollapse');
  if (btn) btn.addEventListener('click', () => { 
    sidebar.classList.toggle('active'); 
    main.classList.toggle('active'); 
  });

  const mq = window.matchMedia('(max-width: 576px)');
  const handle = e => { 
    if (e.matches) { 
      sidebar.classList.add('active'); 
      main.classList.add('active'); 
    } else { 
      sidebar.classList.remove('active'); 
      main.classList.remove('active'); 
    } 
  };
  mq.addEventListener('change', handle); 
  handle(mq);
}