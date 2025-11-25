// Pagination state
let sessionsPage = 1;
const itemsPerPage = 10; // Show 10 sessions per page

// Helper to show/hide loading
function showLoading(show = true) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
}

// Check if admin is viewing as a trainer
function getViewingTrainerId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('viewAs');
}

async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) { location.href = '/'; return null; }
  return data;
}

async function loadSessions() { 
  const viewingTrainerId = getViewingTrainerId();
  let url = '/api/trainer/sessions';
  if (viewingTrainerId) url = `/api/admin/trainer/${viewingTrainerId}/sessions`;
  const res = await fetch(url); 
  return await res.json(); 
}


function statusDropdown(s) {
  // Map status to user-friendly and allowed next options
  const statusOptions = {
    active:    [{ v: 'active', t: 'Active' }, { v: 'rejected', t: 'Rejected' }],
    rejected:  [{ v: 'rejected', t: 'Rejected' }],
    submitted: [{ v: 'submitted', t: 'Submitted' }, { v: 'analysing', t: 'Analyse' }],
    analysing: [{ v: 'analysing', t: 'Analysing' }],
    completed: [{ v: 'completed', t: 'Completed' }],
    archived: [{ v: 'archived', t: 'Archived' }]
  };
  const canEdit = !['completed','archived','rejected','analysing'].includes(s.status);
  const options = statusOptions[s.status] || [ {v:s.status, t:s.status} ];
  let html = `<select data-status-dropdown data-id="${s._id}" ${canEdit?'':'disabled'}>`;
  for(const opt of options) html += `<option value="${opt.v}" ${s.status === opt.v ? 'selected' : ''}>${opt.t}</option>`;
  html += '</select>';
  return html;
}

function rowActions(s){
  // Archive only on active/rejected/completed
  let allowArchive = ['active','rejected','completed'].includes(s.status);
  let viewRespBtn = `<button data-act="responses" data-id="${s._id}" class="btn-info" style="width:auto;font-size:12px;padding:8px 14px;">Response and Analysis</button>`;
  let archiveBtn = allowArchive ? `<button data-act="set" data-status="archived" data-id="${s._id}" class="btn-secondary" style="width:auto;font-size:12px;padding:8px 14px;">Archive</button>` : '';
  return (archiveBtn + viewRespBtn);
}

async function render() {
  const sessions = await loadSessions();
  
  // Store globally for pagination
  window.allSessions = sessions;

  // Update session count
  const sessionCount = document.getElementById('sessionCount');
  if (sessionCount) {
    sessionCount.textContent = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`;
  }

  // Calculate pagination
  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const startIndex = (sessionsPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageSessions = sessions.slice(startIndex, endIndex);

  const tbody = document.getElementById('sessionsBody');
  tbody.innerHTML = '';
  
  if (sessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-text">No sessions found</div>
            <div class="empty-subtext">Create a new session from the dashboard to get started</div>
          </div>
        </td>
      </tr>
    `;
    renderPagination(0, 0);
    return;
  }
  
  pageSessions.forEach(s => {
    const tr = document.createElement('tr');
    // Display team members or legacy single user
    let teamDisplay = '';
    if (s.teamMembers && s.teamMembers.length > 0) {
      teamDisplay = s.teamMembers.map(tm => {
        const username = tm.userId?.username || 'Unknown';
        const customName = tm.customName ? ` (${tm.customName})` : '';
        return username + customName;
      }).join(', ');
    } else {
      teamDisplay = s.userId?.username || '';
    }
    tr.innerHTML = `<td>${s.scenarioId?.title || ''}</td><td>${teamDisplay}</td><td>${statusDropdown(s)}</td><td>${rowActions(s)}</td>`;
    tbody.appendChild(tr);
  });
  
  // Render pagination
  renderPagination(totalPages, sessions.length);

  tbody.querySelectorAll('button[data-act="set"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id=btn.getAttribute('data-id');
      const status=btn.getAttribute('data-status');
      try {
        const res = await fetch(`/api/trainer/session-status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, status })});
        if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || `Failed (${res.status}) to update status`); return; }
        render();
      } catch (e) { alert(e.message || 'Network error'); }
    });
  });

  tbody.querySelectorAll('select[data-status-dropdown]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.getAttribute('data-id');
      const newStatus = sel.value;
      // Handle Analyse - opens analysis form page
      if(newStatus==='analysing'){
        const viewingTrainerId = getViewingTrainerId();
        if(viewingTrainerId){
          window.location = `trainer-analysis.html?sessionId=${encodeURIComponent(id)}&viewAs=${viewingTrainerId}`;
        }else{
          window.location = `trainer-analysis.html?sessionId=${encodeURIComponent(id)}`;
        }
        return;
      }
      // Otherwise update immediately
      try {
        const res = await fetch(`/api/trainer/session-status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, status: newStatus })});
        if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || `Failed (${res.status}) to update status`); return; }
        render();
      } catch (e) { alert(e.message || 'Network error'); }
    });
  });

  tbody.querySelectorAll('button[data-act="responses"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id=btn.getAttribute('data-id');
      const viewingTrainerId = getViewingTrainerId();
      if(viewingTrainerId){
        location.href=`trainer-session-responses.html?sessionId=${encodeURIComponent(id)}&viewAs=${viewingTrainerId}`;
      }else{
        location.href=`trainer-session-responses.html?sessionId=${encodeURIComponent(id)}`;
      }
    });
  });
}

// Render pagination
function renderPagination(totalPages, totalItems) {
  const paginationContainer = document.getElementById('sessionsPagination');
  if (!paginationContainer) return;
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  paginationContainer.innerHTML = `
    <div class="pagination">
      <button class="pagination-btn" id="sessionsPrevBtn" ${sessionsPage === 1 ? 'disabled' : ''} onclick="navigateSessionsPage('prev')">← Prev</button>
      <span class="pagination-info">Page ${sessionsPage} of ${totalPages} (${totalItems} total)</span>
      <button class="pagination-btn" id="sessionsNextBtn" ${sessionsPage === totalPages ? 'disabled' : ''} onclick="navigateSessionsPage('next')">Next →</button>
    </div>
  `;
}

// Navigation functions for pagination
function navigateSessionsPage(direction) {
  const sessions = window.allSessions || [];
  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  
  if (direction === 'prev' && sessionsPage > 1) {
    sessionsPage--;
    render();
    window.scrollTo({ top: document.getElementById('sessionsTable').offsetTop - 100, behavior: 'smooth' });
  } else if (direction === 'next' && sessionsPage < totalPages) {
    sessionsPage++;
    render();
    window.scrollTo({ top: document.getElementById('sessionsTable').offsetTop - 100, behavior: 'smooth' });
  }
}

showLoading(true);
ensureTrainer().then(() => {
  // Update navigation links to preserve viewAs parameter
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    const dashboardLink = document.querySelector('a[href="trainer-dashboard.html"]');
    const archivedLink = document.querySelector('a[href="trainer-sessions-archived.html"]');
    if (dashboardLink) {
      dashboardLink.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    }
    if (archivedLink) {
      archivedLink.href = `trainer-sessions-archived.html?viewAs=${viewingTrainerId}`;
    }
  }
  
  document.getElementById('refreshBtn').addEventListener('click', () => {
    sessionsPage = 1; // Reset to first page
    render().then(() => showLoading(false)).catch(() => showLoading(false));
  });
  render().then(() => showLoading(false)).catch(() => showLoading(false));
}).catch(() => showLoading(false));
