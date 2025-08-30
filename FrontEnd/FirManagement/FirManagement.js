
/* ==================== CONFIG ==================== */
const API_URL = 'http://localhost:5000/api/fir';
const OFFICERS_API = 'http://localhost:5000/api/officers';
const PAGE_SIZE = 10;
const USE_TOKEN = false;

/* ==================== STATE ==================== */
let allReports = [];
let filtered = [];
let currentPage = 1;
let officersCache = [];
let assignTarget = null;

/* ==================== UTILS ==================== */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function debounce(fn, delay = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); };
}
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—'
    : d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function safe(v, f='—'){ return (v===null||v===undefined||v==='')?f:String(v); }
function toCsv(rows){
  if(!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  return [
    headers.map(esc).join(','),
    ...rows.map(r=>headers.map(h=>esc(r[h])).join(','))
  ].join('\n');
}
function showError(msg){
  const area=$('#feedbackArea'); if(!area) return;
  area.innerHTML=`<div class="feedback">
      <div class="error-message"><i class="fas fa-exclamation-circle"></i><span>${msg}</span></div>
    </div>`;
}
function showSuccess(msg){
  const area=$('#feedbackArea'); if(!area) return;
  area.innerHTML=`<div class="feedback">
      <div class="success-message"><i class="fas fa-check-circle"></i><span>${msg}</span></div>
    </div>`;
  setTimeout(()=>{area.innerHTML='';},3000);
}

/* ==================== FETCH ==================== */
async function fetchReports(){
  const tbody=$('#reportsTbody');
  tbody.innerHTML=`<tr><td colspan="8" class="loading-cell">
      <div style="border:3px solid #f3f3f3;border-top:3px solid var(--primary);border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:0 auto"></div>
      <div style="margin-top:8px;color:#777">Loading reports...</div>
    </td></tr>`;
  try{
    const headers={'Content-Type':'application/json'};
    if(USE_TOKEN){
      const token=localStorage.getItem('token');
      if(token) headers['Authorization']=`Bearer ${token}`;
    }
    const res=await fetch(`${API_URL}?limit=1000`,{headers,credentials:'include'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload=await res.json();
    const list=Array.isArray(payload?.data)?payload.data:(Array.isArray(payload)?payload:[]);
    allReports=list.map(r=>{
      const rawId=r._id||r.reportId||r.id;
      return{
        id:String(rawId).replace(/[()]/g,''),
        reportId:r.reportId||r.firId||r.displayId||rawId,
        complaint:r.complaint||r.description||r.details||r.summary||'—',
        incidentType:r.incidentType||r.crimeType||'—',
        location:r.location||r.incidentLocation||r.address||'—',
        state:r.state||r.region||'—',
        dateTime:r.incidentDateTime||r.reportedAt||r.date||r.createdAt||null,
        status:r.status||'—',
        assignedOfficer:r.assignedOfficer||r.assignedOfficerName||'Unassigned',
        assignedOfficerId:r.assignedOfficerId||r.assignedOfficer||'',
        raw:r
      };
    });
    filtered=[...allReports];
    currentPage=1;
    renderStats();
    renderTable();
  }catch(err){
    $('#reportsTbody').innerHTML='';
    showError(`Failed to load reports: ${err.message}. Check API endpoints in DevTools → Network.`);
  }
}

async function fetchOfficers(){
  try{
    const headers={'Content-Type':'application/json'};
    if(USE_TOKEN){
      const token=localStorage.getItem('token');
      if(token) headers['Authorization']=`Bearer ${token}`;
    }
    const res=await fetch(OFFICERS_API,{headers,credentials:'include'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload=await res.json();
    const list=Array.isArray(payload?.data)?payload.data:(Array.isArray(payload)?payload:[]);
    return list.map(o=>({
      id: String(o.reportId||o.id||o.officerId).replace(/[()]/g,''),
      name:o.name||o.fullName||o.officerName||'',
      badgeId:o.badgeId||o.id||o._id||'',
      officerId:o.officerId||o._id||o.id
    }));
  }catch(err){
    showError(`Failed to load officers: ${err.message}`);
    return [];
  }
}

/* ==================== RENDER ==================== */
function renderStats(){
  const elTotal=$('#statTotal'),
        el24h=$('#stat24h'),
        elCyber=$('#statCyber'),
        elStates=$('#statStates');
  if(elTotal) elTotal.textContent=allReports.length;
  if(el24h){
    const now=Date.now();
    const last24=allReports.filter(r=>{
      const t=r.dateTime?new Date(r.dateTime).getTime():NaN;
      return !isNaN(t)&&(now-t)<=24*60*60*1000;
    }).length;
    el24h.textContent=last24;
  }
  if(elCyber) elCyber.textContent=allReports.filter(r=>String(r.incidentType).toLowerCase().includes('cyber')).length;
  if(elStates) elStates.textContent=new Set(allReports.map(r=>safe(r.state,''))).size||0;
}

function renderTable(){
  const tbody=$('#reportsTbody');
  tbody.innerHTML='';
  const start=(currentPage-1)*PAGE_SIZE;
  const rows=filtered.slice(start,start+PAGE_SIZE);
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="8" class="loading-cell">No reports found</td></tr>`;
    const ti=$('#tableInfo'); if(ti) ti.textContent=`Showing 0 to 0 of ${filtered.length} entries`;
    renderPagination(); return;
  }
  for(const r of rows){
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${safe(r.reportId)}</td>
      <td class="complaint-cell">${safe(r.complaint)}</td>
      <td>${safe(r.incidentType)}</td>
      <td>${safe(r.location)}</td>
      <td>${formatDateTime(r.dateTime)}</td>
      <td><span class="status-badge status-${r.status.toLowerCase()}">${safe(r.status)}</span></td>
      <td>${safe(r.assignedOfficer)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon small view-btn" data-id="${r.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon small assign-btn" data-id="${r.id}">
            <i class="fas fa-user-plus"></i>
          </button>
          <button class="btn-icon small delete-btn" data-id="${r.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }
  const end=Math.min(start+PAGE_SIZE,filtered.length);
  const ti=$('#tableInfo'); if(ti) ti.textContent=`Showing ${start+1} to ${end} of ${filtered.length} entries`;
  $$('.view-btn').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.id;
    const item=allReports.find(x=>String(x.id)===String(id));
    if(item) openModal(item);
  }));
  $$('.assign-btn').forEach(b=>b.addEventListener('click',()=>openAssignModal(b.dataset.id)));
  $$('.delete-btn').forEach(b=>b.addEventListener('click',()=>deleteReport(b.dataset.id)));
  renderPagination();
}

function renderPagination(){
  const total=Math.ceil(filtered.length/PAGE_SIZE)||1;
  const pag=$('#pagination'); pag.innerHTML='';
  const add=(html,page,dis=false,act=false)=>{
    const btn=document.createElement('button');
    btn.className='pagination-btn'+(act?' active':'');
    btn.disabled=dis; btn.innerHTML=html;
    btn.addEventListener('click',()=>{if(!dis){currentPage=page;renderTable();}});
    pag.appendChild(btn);
  };
  add('<i class="fas fa-chevron-left"></i>',Math.max(1,currentPage-1),currentPage===1);
  const win=5; let s=Math.max(1,currentPage-Math.floor(win/2));
  let e=Math.min(total,s+win-1); if(e-s+1<win) s=Math.max(1,e-win+1);
  for(let p=s;p<=e;p++) add(String(p),p,false,p===currentPage);
  add('<i class="fas fa-chevron-right"></i>',Math.min(total,currentPage+1),currentPage===total);
}

/* ==================== ASSIGNMENT ==================== */
async function openAssignModal(id){
  assignTarget=String(id).replace(/[()]/g,'');
  const select=$('#officerSelect');
  select.innerHTML='<option value="">Select officer</option>';
  if(!officersCache.length) officersCache=await fetchOfficers();
  officersCache.forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.id;
    opt.textContent=o.badgeId?`${o.name} (${o.badgeId})`:o.name;
    opt.setAttribute('data-name',o.name);
    select.appendChild(opt);
  });
  const modal=$('#assignModal');
  modal.style.display='flex';
  modal.setAttribute('aria-hidden','false');
}

function closeAssignModal(){
  const modal=$('#assignModal');
  modal.style.display='none';
  modal.setAttribute('aria-hidden','true');
  assignTarget=null; $('#officerSelect').value='';
}

async function confirmAssign(){
  const select=$('#officerSelect');
  const officerId=select.value;
  const officerName=select.options[select.selectedIndex]?.getAttribute('data-name')||'';
  if(!officerId||!assignTarget){ showError('Please select an officer'); return; }
  try{
    const endpoint=`${API_URL}/${assignTarget}/assign`;
    const res=await fetch(endpoint,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({ officerId, officerName })
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload=await res.json();
    console.log('Assignment Successful via',endpoint,payload);
    const item=allReports.find(r=>String(r.id)===String(assignTarget));
    if(item){
      item.assignedOfficer=officerName||'Unassigned';
      item.assignedOfficerId=officerId;
      item.status='Assigned';
    }
    renderTable();
    showSuccess('Officer assigned successfully!');
  }catch(err){
    showError(`Failed to assign officer: ${err.message}`);
  }finally{
    closeAssignModal();
  }
}

async function deleteReport(id){
  if(!confirm('Are you sure you want to delete this report?')) return;
  try{
    const endpoint=`${API_URL}/${String(id).replace(/[()]/g,'')}`;
    const res=await fetch(endpoint,{method:'DELETE',credentials:'include'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    allReports=allReports.filter(r=>String(r.id)!==String(id));
    applyFilter($('#tableFilter')?.value || $('#globalSearch')?.value || '');
    showSuccess('Report deleted successfully!');
  }catch(err){
    showError(`Failed to delete report: ${err.message}`);
  }
}

/* ==================== SEARCH ==================== */
function applyFilter(term){
  const t=term.trim().toLowerCase();
  filtered=!t?[...allReports]:allReports.filter(r=>{
    const blob=[r.reportId,r.complaint,r.incidentType,r.location,r.status,r.assignedOfficer,r.state]
      .map(v=>String(v??'').toLowerCase()).join(' ');
    return blob.includes(t);
  });
  currentPage=1;
  renderTable();
}

/* ==================== MODAL ==================== */
function detail(label,val){
  return `<div class="detail"><div class="label">${label}:</div><div>${safe(val)}</div></div>`;
}
function openModal(item){
  $('#modalBody').innerHTML=`
    ${detail('Report ID',item.reportId)}
    ${detail('Complaint',item.complaint)}
    ${detail('Incident Type',item.incidentType)}
    ${detail('Location',item.location)}
    ${detail('Date/Time',formatDateTime(item.dateTime))}
    ${detail('Status',item.status)}
    ${detail('Assigned Officer',item.assignedOfficer)}
    ${detail('Officer ID',item.assignedOfficerId||'-')}
    ${detail('State',item.state||'-')}
  `;
  const modal=$('#reportModal');
  modal.style.display='flex';
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){
  const m=$('#reportModal');
  m.style.display='none';
  m.setAttribute('aria-hidden','true');
}

/* ==================== EXPORT ==================== */
function exportCsv(){
  if(!filtered.length) return showError('Nothing to export.');
  const rows=filtered.map(r=>({
    reportId:r.reportId,
    complaint:r.complaint,
    incidentType:r.incidentType,
    location:r.location,
    dateTime:r.dateTime||'',
    status:r.status,
    assignedOfficer:r.assignedOfficer,
    assignedOfficerId:r.assignedOfficerId,
    state:r.state
  }));
  const blob=new Blob([toCsv(rows)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`reports_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ==================== SIDEBAR ==================== */
function setupSidebar(){
  const sidebar=document.querySelector('.sidebar');
  const main=document.querySelector('.main');
  const btn=document.getElementById('sidebarCollapse');
  if(btn) btn.addEventListener('click',()=>{ sidebar.classList.toggle('active'); main.classList.toggle('active'); });
  const mq=window.matchMedia('(max-width: 576px)');
  const handle=e=>{ if(e.matches){sidebar.classList.add('active');main.classList.add('active');}
                     else{sidebar.classList.remove('active');main.classList.remove('active');}};
  mq.addEventListener('change',handle); handle(mq);
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded',()=>{
  setupSidebar();
  fetchReports();

  const g=$('#globalSearch'); if(g) g.addEventListener('keyup',debounce(e=>applyFilter(e.target.value),300));
  const t=$('#tableFilter');  if(t) t.addEventListener('keyup',debounce(e=>applyFilter(e.target.value),300));
  const c=$('#clearSearchBtn'); if(c) c.addEventListener('click',()=>{if(g)g.value='';if(t)t.value='';applyFilter('');});
  const r1=$('#refreshBtn'); if(r1) r1.addEventListener('click',fetchReports);
  const r2=$('#btnSoftRefresh'); if(r2) r2.addEventListener('click',fetchReports);
  const ex=$('#exportCsvBtn'); if(ex) ex.addEventListener('click',exportCsv);
  const x=$('#closeModal'); if(x) x.addEventListener('click',closeModal);
  window.addEventListener('click',e=>{
    if(e.target.id==='reportModal') closeModal();
    if(e.target.id==='assignModal') closeAssignModal();
  });
  const xa=$('#closeAssignModal'); if(xa) xa.addEventListener('click',closeAssignModal);
  const conf=$('#confirmAssign'); if(conf) conf.addEventListener('click',confirmAssign);

  const style=document.createElement('style');
  style.textContent=`
    @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
    .status-badge{padding:4px 8px;border-radius:12px;font-size:12px;font-weight:500;}
    .status-registered{background:#e3f2fd;color:#1976d2;}
    .status-assigned{background:#fff8e1;color:#f57c00;}
    .status-in-progress{background:#fff3e0;color:#ef6c00;}
    .status-resolved{background:#e8f5e9;color:#388e3c;}
    .status-closed{background:#f5f5f5;color:#616161;}
  `;
  document.head.appendChild(style);
});
