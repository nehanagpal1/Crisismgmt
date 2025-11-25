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

// Render active sessions
function renderActiveSessions(sessions) {
  const container = document.getElementById('activeSessionsList');
  const activeSessions = sessions.filter(s => s.status === 'active');
  
  if (activeSessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💤</div>
        <div class="empty-state-text">No active sessions running</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  activeSessions.forEach(session => {
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
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Render scenarios
function renderScenarios(scenarios) {
  const container = document.getElementById('scenarioList');
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
    return;
  }
  
  container.innerHTML = '';
  visibleScenarios.forEach(scenario => {
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

function navigateToAllScenarios() {
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    location.href = `trainer-scenarios.html?viewAs=${viewingTrainerId}`;
  } else {
    location.href = 'trainer-scenarios.html';
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

// Logout
document.getElementById('logoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch('/logout', { method: 'POST' });
  location.href = '/';
});

