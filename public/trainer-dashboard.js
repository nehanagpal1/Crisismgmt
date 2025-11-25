// Pagination state
let sessionsPage = 1;
let scenariosPage = 1;
const itemsPerPage = 5; // Show 5 items per page for both

// Check if admin is viewing as a trainer
function getViewingTrainerId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('viewAs');
}

// Ensure trainer is logged in
async function ensureTrainer() {
  const r = await fetch('/check-session');
  const d = await r.json();
  if (!d.loggedIn || (d.role !== 'trainer' && d.role !== 'admin')) {
    location.href = '/';
    return null;
  }
  return d;
}

// Load scenarios
async function loadScenarios() {
  const viewingTrainerId = getViewingTrainerId();
  let url = '/api/trainer/scenarios';
  
  // If admin is viewing as trainer, get that trainer's scenarios
  if (viewingTrainerId) {
    url = `/api/admin/trainer/${viewingTrainerId}/scenarios`;
  }
  
  const r = await fetch(url);
  return await r.json();
}

// Load sessions
async function loadSessions() {
  const viewingTrainerId = getViewingTrainerId();
  let url = '/api/trainer/sessions';
  
  // If admin is viewing as trainer, get that trainer's sessions
  if (viewingTrainerId) {
    url = `/api/admin/trainer/${viewingTrainerId}/sessions`;
  }
  
  const r = await fetch(url);
  return await r.json();
}

// Calculate stats
function calculateStats(scenarios, sessions) {
  const total = scenarios.length;
  const active = scenarios.filter(s => s.status === 'active').length;
  const draft = scenarios.filter(s => s.status === 'draft').length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  
  return { total, active, draft, activeSessions };
}

// Render stats cards
function renderStats(stats) {
  document.getElementById('totalScenarios').textContent = stats.total;
  document.getElementById('activeScenarios').textContent = stats.active;
  document.getElementById('activeSessions').textContent = stats.activeSessions;
  document.getElementById('draftScenarios').textContent = stats.draft;
}

// Archive session
async function archiveSession(sessionId) {
  if (!confirm('Archive this session? Archived sessions cannot be reactivated.')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/trainer/sessions/${sessionId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Failed to archive session (${res.status})`);
      return;
    }
    
    alert('Session archived successfully');
    // Reset pagination and reload
    sessionsPage = 1;
    location.reload();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

// Render active sessions with pagination
function renderActiveSessions(sessions) {
  const container = document.getElementById('activeSessionsList');
  const paginationContainer = document.getElementById('sessionsPagination');
  
  // Filter to show only active sessions
  const activeSessions = sessions.filter(s => s.status === 'active');
  
  if (activeSessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💤</div>
        <div class="empty-state-text">No active sessions running</div>
      </div>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(activeSessions.length / itemsPerPage);
  const startIndex = (sessionsPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageSessions = activeSessions.slice(startIndex, endIndex);
  
  container.innerHTML = '';
  pageSessions.forEach(session => {
    const card = document.createElement('div');
    card.className = 'session-card-modern';
    
    // Get team members info
    let teamInfo = '';
    if (session.teamMembers && session.teamMembers.length > 0) {
      const teamCount = session.teamMembers.length;
      teamInfo = `${teamCount} participant${teamCount > 1 ? 's' : ''} active`;
    } else if (session.userId) {
      teamInfo = `1 participant active`;
    }
    
    // Build monitor session URL with viewAs parameter if present
    const viewingTrainerId = getViewingTrainerId();
    let monitorUrl = `trainer-session-responses.html?sessionId=${session._id}`;
    if (viewingTrainerId) {
      monitorUrl += `&viewAs=${viewingTrainerId}`;
    }
    
    card.innerHTML = `
      <div class="session-header">
        <div class="session-info">
          <h3>${session.scenarioId?.title || 'Untitled Scenario'}</h3>
          <div class="session-meta">Round ${session.currentRound || 1} of ${session.scenarioId?.numRounds || 5}</div>
          <div class="participants-info">${teamInfo}</div>
        </div>
        <div class="session-actions">
          <span class="badge-live">Live</span>
          <button class="btn-monitor" onclick="location.href='${monitorUrl}'">
            Monitor Session
          </button>
          <button class="btn-archive-session" onclick="archiveSession('${session._id}')">
            Archive Session
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Render pagination
  if (paginationContainer) {
    renderSessionsPagination(totalPages, activeSessions.length);
  }
}

// Render sessions pagination
function renderSessionsPagination(totalPages, totalItems) {
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

// Render scenarios with pagination
function renderScenarios(scenarios) {
  const container = document.getElementById('scenarioList');
  const paginationContainer = document.getElementById('scenariosPagination');
  const viewingTrainerId = getViewingTrainerId();
  
  // Filter to show only draft and active scenarios
  const visibleScenarios = scenarios.filter(s => s.status === 'draft' || s.status === 'active');
  
  if (visibleScenarios.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No scenarios created yet</div>
      </div>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(visibleScenarios.length / itemsPerPage);
  const startIndex = (scenariosPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageScenarios = visibleScenarios.slice(startIndex, endIndex);
  
  container.innerHTML = '';
  pageScenarios.forEach(scenario => {
    const card = document.createElement('div');
    card.className = 'scenario-card-modern';
    
    // Status badge
    let statusBadge = '';
    if (scenario.status === 'draft') {
      statusBadge = '<span class="badge-status badge-draft">draft</span>';
    } else if (scenario.status === 'active') {
      statusBadge = '<span class="badge-status badge-active">active</span>';
    }
    
    // Build edit URL with viewAs parameter if present
    let editUrl = `trainer-edit-scenario.html?id=${scenario._id}`;
    if (viewingTrainerId) {
      editUrl += `&viewAs=${viewingTrainerId}`;
    }
    
    // Activate button (only for draft scenarios)
    const activateBtn = scenario.status === 'draft'
      ? `<button class="btn-small btn-activate" onclick="activateScenario('${scenario._id}')">Activate</button>`
      : '';
    
    card.innerHTML = `
      <div class="scenario-header">
        <div class="scenario-info">
          <h3 onclick="location.href='${editUrl}'">${scenario.title}</h3>
          <div class="scenario-description">${scenario.description || 'No description provided'}</div>
          <div class="scenario-details">
            ${statusBadge}
            Template: ${scenario.templateType || 'custom'} • 
            Rounds: ${scenario.numRounds || 5} • 
            Timer: ${scenario.responseTimerSec || 120}s
          </div>
        </div>
        <div class="scenario-actions">
          <button class="btn-small btn-edit" onclick="location.href='${editUrl}'">
            Edit
          </button>
          ${activateBtn}
          <button class="btn-small btn-archive" onclick="archiveScenario('${scenario._id}')">
            Archive
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Render pagination
  if (paginationContainer) {
    renderScenariosPagination(totalPages, visibleScenarios.length);
  }
}

// Render scenarios pagination
function renderScenariosPagination(totalPages, totalItems) {
  const paginationContainer = document.getElementById('scenariosPagination');
  if (!paginationContainer) return;
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  paginationContainer.innerHTML = `
    <div class="pagination">
      <button class="pagination-btn" id="scenariosPrevBtn" ${scenariosPage === 1 ? 'disabled' : ''} onclick="navigateScenariosPage('prev')">← Prev</button>
      <span class="pagination-info">Page ${scenariosPage} of ${totalPages} (${totalItems} total)</span>
      <button class="pagination-btn" id="scenariosNextBtn" ${scenariosPage === totalPages ? 'disabled' : ''} onclick="navigateScenariosPage('next')">Next →</button>
    </div>
  `;
}

// Activate scenario (from draft to active)
async function activateScenario(scenarioId) {
  if (!confirm('Activate this scenario? It will be available for creating new sessions.')) {
    return;
  }
  
  try {
    // First, get the current scenario to preserve all fields
    const getRes = await fetch(`/api/trainer/scenarios/${scenarioId}`);
    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      alert(err.error || `Failed to load scenario (${getRes.status})`);
      return;
    }
    
    const data = await getRes.json();
    const scenario = data.scenario;
    
    // Update with status set to active, preserving all other fields
    const payload = {
      title: scenario.title,
      description: scenario.description,
      initialText: scenario.initialText,
      status: 'active',
      templateType: scenario.templateType,
      numRounds: scenario.numRounds,
      responseTimerSec: scenario.responseTimerSec
    };
    
    const res = await fetch(`/api/trainer/scenarios/${scenarioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Failed to activate scenario (${res.status})`);
      return;
    }
    
    alert('Scenario activated successfully');
    // Reset pagination and reload
    scenariosPage = 1;
    location.reload();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

// Archive scenario
async function archiveScenario(scenarioId) {
  if (!confirm('Archive this scenario? Active sessions cannot use archived scenarios.')) {
    return;
  }
  
  try {
    // First, get the current scenario to preserve all fields
    const getRes = await fetch(`/api/trainer/scenarios/${scenarioId}`);
    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      alert(err.error || `Failed to load scenario (${getRes.status})`);
      return;
    }
    
    const data = await getRes.json();
    const scenario = data.scenario;
    
    // Update with status set to archived, preserving all other fields
    const payload = {
      title: scenario.title,
      description: scenario.description,
      initialText: scenario.initialText,
      status: 'archived',
      templateType: scenario.templateType,
      numRounds: scenario.numRounds,
      responseTimerSec: scenario.responseTimerSec
    };
    
    const res = await fetch(`/api/trainer/scenarios/${scenarioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Failed to archive scenario (${res.status})`);
      return;
    }
    
    alert('Scenario archived successfully');
    // Reset pagination and reload
    scenariosPage = 1;
    location.reload();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

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

// Initialize dashboard
showLoading(true);
ensureTrainer().then(async (user) => {
  if (!user) {
    showLoading(false);
    return;
  }
  
  const viewingTrainerId = getViewingTrainerId();
  
  // If admin is viewing as trainer, fetch trainer name
  if (viewingTrainerId && user.role === 'admin') {
    try {
      const res = await fetch('/api/admin/users');
      const users = await res.json();
      const trainer = users.find(u => u._id === viewingTrainerId);
      if (trainer) {
        document.getElementById('userName').textContent = `${trainer.username} (Viewing as Admin)`;
      }
    } catch (err) {
      console.error('Error loading trainer info:', err);
    }
  } else {
    // Set user name
    document.getElementById('userName').textContent = user.username || 'Trainer';
  }
  
  // Show admin links if user is admin
  if (user.role === 'admin') {
    const headerActions = document.querySelector('.header-right');
    
    // Add back to admin dashboard link
    const backLink = document.createElement('a');
    backLink.href = 'admin-dashboard.html';
    backLink.style.cssText = 'color:#f59e0b;text-decoration:none;font-size:14px;font-weight:600;padding:8px 16px;border:1px solid #f59e0b;border-radius:8px;transition:all 0.2s;';
    backLink.innerHTML = '← Admin Dashboard';
    backLink.onmouseover = () => {
      backLink.style.background = 'rgba(245, 158, 11, 0.1)';
    };
    backLink.onmouseout = () => {
      backLink.style.background = 'transparent';
    };
    headerActions.insertBefore(backLink, headerActions.firstChild);
  }
  
  // Load data
  const [scenarios, sessions] = await Promise.all([
    loadScenarios(),
    loadSessions()
  ]);
  
  // Store globally for pagination
  window.allScenarios = scenarios;
  window.allSessions = sessions;
  
  // Calculate and render stats
  const stats = calculateStats(scenarios, sessions);
  renderStats(stats);
  
  // Render active sessions
  renderActiveSessions(sessions);
  
  // Render scenarios
  renderScenarios(scenarios);
  
  // Hide loading
  showLoading(false);
}).catch(err => {
  console.error('Error loading dashboard:', err);
  showLoading(false);
});

// Navigation with viewAs parameter
function navigateToSessions() {
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    location.href = `trainer-sessions.html?viewAs=${viewingTrainerId}`;
  } else {
    location.href = 'trainer-sessions.html';
  }
}

function navigateToArchivedScenarios() {
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    location.href = `trainer-scenarios.html?viewAs=${viewingTrainerId}&status=archived`;
  } else {
    location.href = 'trainer-scenarios.html?status=archived';
  }
}

// Create scenario button
document.getElementById('createScenarioBtn').addEventListener('click', () => {
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    location.href = `trainer-create-scenario.html?viewAs=${viewingTrainerId}`;
  } else {
    location.href = 'trainer-create-scenario.html';
  }
});

// Navigation functions for pagination
function navigateSessionsPage(direction) {
  const sessions = window.allSessions || [];
  const activeSessions = sessions.filter(s => s.status === 'active');
  const totalPages = Math.ceil(activeSessions.length / itemsPerPage);
  
  if (direction === 'prev' && sessionsPage > 1) {
    sessionsPage--;
    renderActiveSessions(sessions);
    window.scrollTo({ top: document.getElementById('activeSessionsList').offsetTop - 100, behavior: 'smooth' });
  } else if (direction === 'next' && sessionsPage < totalPages) {
    sessionsPage++;
    renderActiveSessions(sessions);
    window.scrollTo({ top: document.getElementById('activeSessionsList').offsetTop - 100, behavior: 'smooth' });
  }
}

function navigateScenariosPage(direction) {
  const scenarios = window.allScenarios || [];
  const visibleScenarios = scenarios.filter(s => s.status === 'draft' || s.status === 'active');
  const totalPages = Math.ceil(visibleScenarios.length / itemsPerPage);
  
  if (direction === 'prev' && scenariosPage > 1) {
    scenariosPage--;
    renderScenarios(scenarios);
    window.scrollTo({ top: document.getElementById('scenarioList').offsetTop - 100, behavior: 'smooth' });
  } else if (direction === 'next' && scenariosPage < totalPages) {
    scenariosPage++;
    renderScenarios(scenarios);
    window.scrollTo({ top: document.getElementById('scenarioList').offsetTop - 100, behavior: 'smooth' });
  }
}

// Logout
document.getElementById('logoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch('/logout', { method: 'POST' });
  location.href = '/';
});

