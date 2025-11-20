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
    
    card.innerHTML = `
      <div class="session-header">
        <div class="session-info">
          <h3>${session.scenarioId?.title || 'Untitled Scenario'}</h3>
          <div class="session-meta">Round ${session.currentRound || 1} of ${session.scenarioId?.numRounds || 5}</div>
          <div class="participants-info">${teamInfo}</div>
        </div>
        <div class="session-actions">
          <span class="badge-live">Live</span>
          <button class="btn-monitor" onclick="location.href='trainer-session-responses.html?sessionId=${session._id}'">
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
  
  // Filter out archived scenarios for main view
  const visibleScenarios = scenarios.filter(s => s.status !== 'archived');
  
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
    } else if (scenario.status === 'archived') {
      statusBadge = '<span class="badge-status badge-archived">archived</span>';
    }
    
    card.innerHTML = `
      <div class="scenario-header">
        <div class="scenario-info">
          <h3 onclick="location.href='trainer-edit-scenario.html?id=${scenario._id}'">${scenario.title}</h3>
          <div class="scenario-description">${scenario.description || 'No description provided'}</div>
          <div class="scenario-details">
            ${statusBadge}
            Template: ${scenario.templateType || 'custom'} • 
            Rounds: ${scenario.numRounds || 5} • 
            Timer: ${scenario.responseTimerSec || 120}s
          </div>
        </div>
        <div class="scenario-actions">
          <button class="btn-small btn-view" onclick="location.href='trainer-edit-scenario.html?id=${scenario._id}'">
            View
          </button>
          <button class="btn-small btn-start" onclick="navigateToSessions()">
            Start Session
          </button>
          <button class="btn-small btn-delete-small" onclick="deleteScenario('${scenario._id}')">
            Delete
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Delete scenario
async function deleteScenario(scenarioId) {
  if (!confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/trainer/scenarios/${scenarioId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Failed to delete scenario (${res.status})`);
      return;
    }
    
    alert('Scenario deleted successfully');
    location.reload();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

// Initialize dashboard
ensureTrainer().then(async (user) => {
  if (!user) return;
  
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
    
    // Add user management link
    const adminLink = document.createElement('a');
    adminLink.href = 'admin-users.html';
    adminLink.style.cssText = 'color:#f59e0b;text-decoration:none;font-size:14px;font-weight:600;padding:8px 16px;border:1px solid #f59e0b;border-radius:8px;transition:all 0.2s;margin-left:12px;';
    adminLink.innerHTML = '👥 User Management';
    adminLink.onmouseover = () => {
      adminLink.style.background = 'rgba(245, 158, 11, 0.1)';
    };
    adminLink.onmouseout = () => {
      adminLink.style.background = 'transparent';
    };
    headerActions.insertBefore(adminLink, headerActions.firstChild);
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

