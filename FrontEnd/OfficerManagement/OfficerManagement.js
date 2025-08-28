const API_OFFICERS = 'http://localhost:5000/api/officers';
const token = localStorage.getItem('token');

async function fetchOfficers(q = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = q ? `${API_OFFICERS}?search=${encodeURIComponent(q)}&limit=100 `
                : `${API_OFFICERS}?limit=100`;
  const res = await fetch(url, { headers, credentials: 'include' });
  const payload = await res.json();

  if (!res.ok || !payload.success) {
    console.error('Failed to load officers', payload);
    // render an error row / toast
    return;
  }

  renderOfficers(payload.data);
}

function renderOfficers(list) {
  const tbody = document.querySelector('.data-table tbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = <tr><td colspan="8" class="no-data">No officers found</td></tr>;
    return;
  }
  for (const o of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.badgeId || '—'}</td>
      <td>
        <div class="user-info">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(o.name || 'Officer')}" alt="Officer">
          <div>
            <div class="user-name">${o.name || '—'}</div>
            <div class="user-email">${o.email || '—'}</div>
          </div>
        </div>
      </td>
      <td>${o.rank || '—'}</td>
      <td>${o.department || '—'}</td>
      <td>${o.phone || '—'}</td>
      <td><span class="status-badge ${String(o.status||'Active').toLowerCase().replace(' ','-')}">${o.status || 'Active'}</span></td>
      <td>${o.assignedCases || 0}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small" data-action="view" data-id="${o._id}"><i class="fas fa-eye"></i></button>
          <button class="btn-icon small" data-action="edit" data-id="${o._id}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon small" data-action="delete" data-id="${o._id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.querySelectorAll('.action-buttons .btn-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const action = e.currentTarget.getAttribute('data-action');
      if (action === 'view') viewOfficer(id);
      if (action === 'edit') editOfficer(id);
      if (action === 'delete') deleteOfficer(id);
    });
  });
}

async function viewOfficer(id){
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_OFFICERS}/${id}, { headers }`);
  const payload = await res.json();
  if (!res.ok || !payload.success) return alert('Failed to load officer');
  // open your modal and show payload.data
  console.log('Officer', payload.data);
}

async function deleteOfficer(id){
  if (!confirm('Delete officer?')) return;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch( `${API_OFFICERS}/${id}, { method: 'DELETE', headers }`);
  const payload = await res.json();
  if (!res.ok || !payload.success) return alert(payload.message || 'Delete failed');
  fetchOfficers();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!token) return (window.location.href = '/FrontEnd/Auth/login.html');
  fetchOfficers();
  // hook up your search boxes to call fetchOfficers(q)
});