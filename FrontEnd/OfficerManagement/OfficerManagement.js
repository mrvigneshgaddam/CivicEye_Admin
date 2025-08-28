// ===== Basic helpers =====
const API = 'http://localhost:5000/api/officers';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const safe = (v, f = '—') => (v === undefined || v === null || v === '') ? f : String(v);
function debounce(fn, t = 300) { let x; return (...a) => { clearTimeout(x); x = setTimeout(() => fn(...a), t); }; }

// ===== Sidebar toggle (kept) =====
document.addEventListener('DOMContentLoaded', () => {
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

  // Load officers
  loadOfficers();

  // Wire search + refresh if present
  $$('.table-header .search-box input, .header-right .search-box input').forEach(inp => {
    inp.addEventListener('keyup', debounce(() => loadOfficers(inp.value.trim()), 300));
  });
  const refreshBtn = document.querySelector('.table-header .btn-icon');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadOfficers());
});

async function loadOfficers(search = '') {
  const tbody = $('#officersTbody') || document.querySelector('.data-table tbody');
  if (!tbody) return console.error('officersTbody not found in DOM');

  // show loading row
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="loading-cell">
        <div class="loading-spinner"></div>
        <span>Loading officers...</span>
      </td>
    </tr>`;

  try {
    const token = localStorage.getItem('token'); // optional if you protect endpoint
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = search 
      ? `${API}?search=${encodeURIComponent(search)}&limit=200`
      : `${API}?limit=200`;

    const res = await fetch(url, { headers, credentials: 'include' });
    const payload = await res.json();
    if (!res.ok || !payload.success) throw new Error(payload.message || `HTTP ${res.status}`);

    renderOfficers(Array.isArray(payload.data) ? payload.data : []);
    const info = document.querySelector('.table-info');
    if (info) info.textContent = `Showing 1 to ${payload.data.length} of ${payload.pagination?.totalItems ?? payload.data.length} entries`;
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <span>Failed to load officers: ${err.message}</span>
          </div>
        </td>
      </tr>`;
  }
}

function renderOfficers(list) {
  const tbody = $('#officersTbody') || document.querySelector('.data-table tbody');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">No officers found</td></tr>`;
    return;
  }

  for (const o of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${safe(o.badgeId)}</td>
      <td>
        <div class="user-info">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(o.name || 'Officer')}" alt="Officer">
          <div>
            <div class="user-name">${safe(o.name)}</div>
            <div class="user-email">${safe(o.email)}</div>
          </div>
        </div>
      </td>
      <td>${safe(o.rank)}</td>
      <td>${safe(o.department)}</td>
      <td>${safe(o.phone)}</td>
      <td><span class="status-badge ${String(o.status || 'Active').toLowerCase().replace(/\s+/g, '-') }">${safe(o.status || 'Active')}</span></td>
      <td>${safe(o.assignedCases || 0)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small" data-action="view" data-id="${o._id}"><i class="fas fa-eye"></i></button>
          <button class="btn-icon small" data-action="edit" data-id="${o._id}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon small" data-action="delete" data-id="${o._id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }

  // Optional: wire actions later
  document.querySelectorAll('.action-buttons .btn-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const action = e.currentTarget.getAttribute('data-action');
      if (action === 'view') console.log('view', id);
      if (action === 'edit') console.log('edit', id);
      if (action === 'delete') console.log('delete', id);
    });
  });
}
