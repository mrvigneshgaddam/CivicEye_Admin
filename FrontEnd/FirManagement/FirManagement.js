/* ==================== CONFIG ==================== */
const API_URL = 'http://localhost:5000/api/fir';  // base path to your backend
const PAGE_SIZE = 10;
const USE_TOKEN = false; // set true if you need Authorization Bearer from localStorage.token

/* ==================== STATE ==================== */
let allReports = [];
let filtered = [];
let currentPage = 1;

/* ==================== UTILS ==================== */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function debounce(fn, delay = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function safe(v, f = '—') { return (v === null || v === undefined || v === '') ? f : String(v); }

function toCsv(rows) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(esc).join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(','))
  ].join('\n');
}

function showError(msg) {
  const area = $('#feedbackArea');
  if (!area) return;
  area.innerHTML = `
    <div class="feedback">
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>${msg}</span>
      </div>
    </div>`;
}

/* ==================== FETCH ==================== */
async function fetchReports() {
  const tbody = $('#reportsTbody');
  tbody.innerHTML = `
    <tr><td colspan="5" class="loading-cell">
      <div style="border:3px solid #f3f3f3;border-top:3px solid var(--primary);border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:0 auto"></div>
      <div style="margin-top:8px;color:#777">Loading reports...</div>
    </td></tr>`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (USE_TOKEN) {
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    // ask for many to paginate on the client; you can switch to server-side later
    const url = `${API_URL}?limit=1000`;
    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();

    // API returns: { success: true, data: [...] , pagination: {...} }
    const list = Array.isArray(payload?.data) ? payload.data
               : (Array.isArray(payload) ? payload : []);

    // Normalize shapes (FIR vs earlier "report" schema)
    allReports = list.map(r => {
      const c = r.complainant || {};
      return {
        reportId   : r.reportId || r.firId || r._id || r.id || '—',
        name       : r.name || c.name || '—',
        email      : r.email || c.email || '—',
        phone      : r.phone || c.phone || '—',
        crimeType  : r.crimeType || r.incidentType || '—',
        date       : r.date || r.incidentDate || r.reportedAt || r.createdAt || null,
        createdAt  : r.createdAt || r.reportedAt || r.date || null,
        location   : r.location || r.address || '—',
        state      : r.state || r.region || (typeof r.location === 'string' ? r.location.split(',').slice(-1)[0]?.trim() : '—'),
        description: r.description || r.details || r.summary || '—',
        evidence   : r.evidence || r.attachments || '—',
        raw        : r
      };
    });

    filtered = [...allReports];
    currentPage = 1;
    renderStats();
    renderTable();
  } catch (err) {
    $('#reportsTbody').innerHTML = '';
    showError(`Failed to load reports: ${err.message}. Check ${API_URL} in DevTools → Network.`);
  }
}

/* ==================== RENDER ==================== */
function renderStats() {
  const elTotal = $('#statTotal');
  const el24h = $('#stat24h');
  const elCyber = $('#statCyber');
  const elStates = $('#statStates');
  if (elTotal)  elTotal.textContent  = allReports.length;
  if (el24h) {
    const now = Date.now();
    const last24 = allReports.filter(r => {
      const d = r.createdAt || r.date; const t = d ? new Date(d).getTime() : NaN;
      return !isNaN(t) && (now - t) <= 24 * 60 * 60 * 1000;
    }).length;
    el24h.textContent = last24;
  }
  if (elCyber)  elCyber.textContent  = allReports.filter(r => String(r.crimeType).toLowerCase().includes('cyber')).length;
  if (elStates) elStates.textContent = new Set(allReports.map(r => safe(r.state, ''))).size || 0;
}

function renderTable() {
  const tbody = $('#reportsTbody'); 
  tbody.innerHTML = '';
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows  = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">No reports found</td></tr>`;
    const ti = $('#tableInfo');
    if (ti) ti.textContent = `Showing 0 to 0 of ${filtered.length} entries`;
    renderPagination(); 
    return;
  }

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${safe(r.reportId)}</td>
      <td>${safe(r.phone)}</td>
      <td>${safe(r.crimeType)}</td>
      <td>${safe(r.state)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small view-btn" data-id="${String(r.reportId).replace(/"/g,'&quot;')}">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }

  const end = Math.min(start + PAGE_SIZE, filtered.length);
  const ti = $('#tableInfo');
  if (ti) ti.textContent = `Showing ${start + 1} to ${end} of ${filtered.length} entries`;

  $$('.view-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-id');
    const item = allReports.find(x => String(x.reportId) === String(id));
    if (item) openModal(item);
  }));

  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pag = $('#pagination'); 
  pag.innerHTML = '';

  const add = (html, page, dis = false, act = false) => {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (act ? ' active' : '');
    btn.disabled = dis; 
    btn.innerHTML = html;
    btn.addEventListener('click', () => { if (!dis) { currentPage = page; renderTable(); } });
    pag.appendChild(btn);
  };

  add('<i class="fas fa-chevron-left"></i>', Math.max(1, currentPage - 1), currentPage === 1);

  const win = 5; 
  let s = Math.max(1, currentPage - Math.floor(win / 2)); 
  let e = Math.min(total, s + win - 1);
  if (e - s + 1 < win) s = Math.max(1, e - win + 1);
  for (let p = s; p <= e; p++) add(String(p), p, false, p === currentPage);

  add('<i class="fas fa-chevron-right"></i>', Math.min(total, currentPage + 1), currentPage === total);
}

/* ==================== SEARCH ==================== */
function applyFilter(term) {
  const t = term.trim().toLowerCase();
  filtered = !t ? [...allReports] : allReports.filter(r => {
    const blob = [r.reportId, r.phone, r.crimeType, r.state, r.name, r.email, r.location, r.description]
      .map(v => String(v ?? '').toLowerCase()).join(' ');
    return blob.includes(t);
  });
  currentPage = 1;
  renderTable();
}

/* ==================== MODAL ==================== */
function detail(label, val) {
  return `
    <div class="detail">
      <div class="label">${label}:</div>
      <div>${safe(val)}</div>
    </div>`;
}

function openModal(item) {
  $('#modalBody').innerHTML = `
    ${detail('Report ID', item.reportId)}
    ${detail('Created At', formatDateTime(item.createdAt))}
    ${detail('Date', formatDateTime(item.date))}
    ${detail('Name', item.name)}
    ${detail('Email', item.email)}
    ${detail('Phone', item.phone)}
    ${detail('Crime Type', item.crimeType)}
    ${detail('State', item.state)}
    ${detail('Location', item.location)}
    ${detail('Description', item.description)}
    ${detail('Evidence', item.evidence)}
  `;
  const modal = $('#reportModal'); 
  modal.style.display = 'flex'; 
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const m = $('#reportModal'); 
  m.style.display = 'none'; 
  m.setAttribute('aria-hidden', 'true');
}

/* ==================== EXPORT ==================== */
function exportCsv() {
  if (!filtered.length) return showError('Nothing to export.');
  const rows = filtered.map(r => ({
    reportId: r.reportId, createdAt: r.createdAt || '', date: r.date || '',
    name: r.name, email: r.email, phone: r.phone, crimeType: r.crimeType,
    state: r.state, location: r.location, description: r.description, evidence: r.evidence
  }));
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a');
  a.href = url; 
  a.download = `fir_reports_${Date.now()}.csv`; 
  document.body.appendChild(a); 
  a.click();
  document.body.removeChild(a); 
  URL.revokeObjectURL(url);
}

/* ==================== SIDEBAR ==================== */
function setupSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  const btn     = document.getElementById('sidebarCollapse');
  if (btn) btn.addEventListener('click', () => { 
    sidebar.classList.toggle('active'); 
    main.classList.toggle('active'); 
  });
  const mq = window.matchMedia('(max-width: 576px)');
  const handle = e => { 
    if (e.matches) { sidebar.classList.add('active'); main.classList.add('active'); } 
    else { sidebar.classList.remove('active'); main.classList.remove('active'); } 
  };
  mq.addEventListener('change', handle); 
  handle(mq);
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  fetchReports();

  const g = $('#globalSearch'); if (g) g.addEventListener('keyup', debounce(e => applyFilter(e.target.value), 300));
  const t = $('#tableFilter');  if (t) t.addEventListener('keyup', debounce(e => applyFilter(e.target.value), 300));
  const c = $('#clearSearchBtn'); if (c) c.addEventListener('click', () => { if (g) g.value=''; if (t) t.value=''; applyFilter(''); });
  const r1 = $('#refreshBtn'); if (r1) r1.addEventListener('click', fetchReports);
  const r2 = $('#btnSoftRefresh'); if (r2) r2.addEventListener('click', fetchReports);
  const ex = $('#exportCsvBtn'); if (ex) ex.addEventListener('click', exportCsv);
  const x  = $('#closeModal'); if (x) x.addEventListener('click', closeModal);
  window.addEventListener('click', e => { if (e.target.id === 'reportModal') closeModal(); });

  const style = document.createElement('style');
  style.textContent = '@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}';
  document.head.appendChild(style);
});
