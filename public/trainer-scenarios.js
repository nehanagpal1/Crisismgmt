let allScenarios = [];
let filteredScenarios = [];
let currentPage = 1;
let itemsPerPage = 8;
let currentFilter = 'all';
let searchTerm = '';

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

// Get viewAs parameter
function getViewingTrainerId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('viewAs');
}

// Ensure trainer is logged in
async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) {
    location.href = '/';
    return null;
  }
  return data;
}

// Load scenarios
async function loadScenarios() {
  const viewingTrainerId = getViewingTrainerId();
  let url = '/api/trainer/scenarios';
  
  if (viewingTrainerId) {
    url = `/api/admin/trainer/${viewingTrainerId}/scenarios`;
  }
  
  const res = await fetch(url);
  return await res.json();
}

// Filter scenarios
function filterScenarios() {
  filteredScenarios = allScenarios.filter(scenario => {
    // Status filter
    let matchesFilter = true;
    if (currentFilter !== 'all') {
      matchesFilter = scenario.status === currentFilter;
    }
    
    // Search filter
    let matchesSearch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      matchesSearch = 
        scenario.title.toLowerCase().includes(term) ||
        (scenario.description && scenario.description.toLowerCase().includes(term)) ||
        (scenario.templateType && scenario.templateType.toLowerCase().includes(term));
    }
    
    return matchesFilter && matchesSearch;
  });
  
  currentPage = 1; // Reset to first page
  renderScenarios();
  renderPagination();
}

// Render scenarios
function renderScenarios() {
  const body = document.getElementById('scenariosBody');
  
  if (filteredScenarios.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">No scenarios found</div>
            <div class="empty-subtext">Try adjusting your filters or search term</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageScenarios = filteredScenarios.slice(startIndex, endIndex);
  
  body.innerHTML = '';
  
  pageScenarios.forEach(scenario => {
    // Status badge
    let statusBadge = '';
    if (scenario.status === 'draft') {
      statusBadge = '<span class="badge badge-draft">Draft</span>';
    } else if (scenario.status === 'active') {
      statusBadge = '<span class="badge badge-active">Active</span>';
    } else if (scenario.status === 'archived') {
      statusBadge = '<span class="badge badge-archived">Archived</span>';
    }
    
    const templateBadge = scenario.templateType && scenario.templateType !== 'custom' 
      ? `<span class="badge badge-template">${scenario.templateType}</span>` 
      : '<span class="badge badge-template" style="color:#94a3b8;border-color:rgba(148,163,184,0.4);background:rgba(148,163,184,0.1);">Custom</span>';
    
    const archiveBtn = scenario.status !== 'archived' 
      ? `<button class="btn-small btn-archive" onclick="markArchived('${scenario._id}')">Archive</button>`
      : '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="scenario-title">${scenario.title}</div>
        <p class="scenario-description">${scenario.description || 'No description provided'}</p>
      </td>
      <td>
        <div class="scenario-badges">
          ${templateBadge}
        </div>
      </td>
      <td>
        <div class="scenario-badges">
          ${statusBadge}
        </div>
      </td>
      <td>
        <div class="scenario-meta">
          ${new Date(scenario.createdAt).toLocaleDateString()}<br>
          Rounds: ${scenario.numRounds || 5} • Timer: ${scenario.responseTimerSec || 120}s
        </div>
      </td>
      <td>
        <div class="scenario-actions">
          <button class="btn-small btn-edit" onclick="editScenario('${scenario._id}')">Edit</button>
          ${archiveBtn}
        </div>
      </td>
    `;
    
    body.appendChild(row);
  });
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredScenarios.length / itemsPerPage);
  
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

// Navigate to edit scenario
function editScenario(scenarioId) {
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    location.href = `trainer-edit-scenario.html?id=${scenarioId}&viewAs=${viewingTrainerId}`;
  } else {
    location.href = `trainer-edit-scenario.html?id=${scenarioId}`;
  }
}

// Archive scenario
async function markArchived(scenarioId) {
  let scenario = allScenarios.find(s => s._id === scenarioId);
  if (!scenario) return;
  
  // Ensure we have all required fields (initialText may not be included in list API)
  if (!scenario.initialText) {
    try {
      const detailRes = await fetch(`/api/trainer/scenarios/${scenarioId}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        scenario = detailData.scenario || scenario;
      }
    } catch (err) {
      console.error('Failed to load scenario detail', err);
    }
  }
  
  if (!confirm('Archive this scenario? Active sessions cannot use archived scenarios.')) return;
  
  const payload = {
    title: scenario.title,
    description: scenario.description,
    initialText: scenario.initialText,
    status: 'archived',
    templateType: scenario.templateType,
    numRounds: scenario.numRounds,
    responseTimerSec: scenario.responseTimerSec
  };
  
  try {
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
    allScenarios = await loadScenarios();
    filterScenarios();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

// Initialize
showLoading(true);
ensureTrainer().then(async (user) => {
  if (!user) {
    showLoading(false);
    return;
  }
  
  // Update navigation links to preserve viewAs parameter
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
      dashboardLink.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    }
  }
  
  // Load scenarios
  allScenarios = await loadScenarios();
  filterScenarios();
  
  // Event listeners for filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update filter
      currentFilter = btn.getAttribute('data-filter');
      filterScenarios();
    });
  });
  
  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    filterScenarios();
  });
  
  // Pagination buttons
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderScenarios();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredScenarios.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderScenarios();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // Create scenario button
  document.getElementById('createScenarioBtn').addEventListener('click', () => {
    if (viewingTrainerId) {
      location.href = `trainer-create-scenario.html?viewAs=${viewingTrainerId}`;
    } else {
      location.href = 'trainer-create-scenario.html';
    }
  });
  
  showLoading(false);
}).catch(err => {
  console.error('Error initializing:', err);
  showLoading(false);
});

