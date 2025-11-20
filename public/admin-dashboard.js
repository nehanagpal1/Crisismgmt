let allTrainers = [];
let allScenarios = [];
let allSessions = [];
let allUsers = [];

// Ensure admin is logged in
async function ensureAdmin() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || data.role !== 'admin') {
    alert('Access denied. Admin privileges required.');
    location.href = '/';
    return null;
  }
  return data;
}

// Load all data
async function loadAllUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Failed to load users');
    return await res.json();
  } catch (err) {
    console.error('Error loading users:', err);
    return [];
  }
}

async function loadScenarios() {
  try {
    const res = await fetch('/api/trainer/scenarios');
    if (!res.ok) throw new Error('Failed to load scenarios');
    return await res.json();
  } catch (err) {
    console.error('Error loading scenarios:', err);
    return [];
  }
}

async function loadSessions() {
  try {
    const res = await fetch('/api/trainer/sessions');
    if (!res.ok) throw new Error('Failed to load sessions');
    return await res.json();
  } catch (err) {
    console.error('Error loading sessions:', err);
    return [];
  }
}

// Calculate stats
function calculateStats() {
  const trainers = allUsers.filter(u => u.role === 'trainer');
  
  return {
    totalTrainers: trainers.length,
    totalUsers: allUsers.length
  };
}

// Update stats display
function updateStats(stats) {
  document.getElementById('totalTrainers').textContent = stats.totalTrainers;
  document.getElementById('totalUsers').textContent = stats.totalUsers;
}

// Get trainer statistics
function getTrainerStats(trainerId) {
  const trainerScenarios = allScenarios.filter(s => s.trainerId && s.trainerId.toString() === trainerId);
  const trainerSessions = allSessions.filter(s => s.trainerId && s.trainerId.toString() === trainerId);
  const activeSessions = trainerSessions.filter(s => s.status === 'active');
  
  return {
    scenarios: trainerScenarios.length,
    sessions: trainerSessions.length,
    activeSessions: activeSessions.length
  };
}

// Get initials from username
function getInitials(username) {
  if (!username) return '?';
  const parts = username.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

// Render trainers
function renderTrainers(trainers) {
  const grid = document.getElementById('trainersGrid');
  grid.innerHTML = '';
  
  if (trainers.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👨‍🏫</div>
        <div class="empty-text">No trainers found</div>
        <div class="empty-subtext">Create trainer accounts in User Management</div>
      </div>
    `;
    return;
  }
  
  trainers.forEach(trainer => {
    const stats = getTrainerStats(trainer._id);
    const initials = getInitials(trainer.username);
    
    const card = document.createElement('div');
    card.className = 'trainer-card';
    
    card.innerHTML = `
      <div class="trainer-header">
        <div class="trainer-avatar">${initials}</div>
        <div class="trainer-info">
          <h3 class="trainer-name">${trainer.username}</h3>
          <p class="trainer-email">${trainer.email || 'No email provided'}</p>
        </div>
      </div>
      
      <div class="trainer-stats">
        <div class="stat-item">
          <div class="stat-item-value">${stats.scenarios}</div>
          <div class="stat-item-label">Scenarios</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-value">${stats.sessions}</div>
          <div class="stat-item-label">Sessions</div>
        </div>
      </div>
      
      <div class="trainer-actions">
        <button class="btn-view" onclick="viewTrainerDashboard('${trainer._id}', '${trainer.username}')">
          View Dashboard
        </button>
        <button class="btn-manage" onclick="manageTrainer('${trainer._id}')">
          Manage
        </button>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

// View trainer dashboard
function viewTrainerDashboard(trainerId, trainerName) {
  // Store trainer info and admin flag in session storage
  sessionStorage.setItem('viewingTrainerId', trainerId);
  sessionStorage.setItem('viewingTrainerName', trainerName);
  sessionStorage.setItem('viewingAsAdmin', 'true');
  
  // Navigate to the actual trainer dashboard with trainer context
  location.href = `trainer-dashboard.html?viewAs=${trainerId}`;
}

// Manage trainer (go to user management)
function manageTrainer(trainerId) {
  location.href = `admin-users.html?highlight=${trainerId}`;
}

// Search trainers
function searchTrainers() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  const filtered = allTrainers.filter(trainer => {
    return trainer.username.toLowerCase().includes(searchTerm) ||
           (trainer.email && trainer.email.toLowerCase().includes(searchTerm));
  });
  
  renderTrainers(filtered);
}

// Load all data and render
async function loadAndRender() {
  // Load all data in parallel
  [allUsers, allScenarios, allSessions] = await Promise.all([
    loadAllUsers(),
    loadScenarios(),
    loadSessions()
  ]);
  
  // Filter trainers
  allTrainers = allUsers.filter(u => u.role === 'trainer');
  
  // Calculate and update stats
  const stats = calculateStats();
  updateStats(stats);
  
  // Render trainers
  renderTrainers(allTrainers);
}

// Search event listener
document.getElementById('searchInput').addEventListener('input', searchTrainers);

// Logout
document.getElementById('logoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch('/logout', { method: 'POST' });
  location.href = '/';
});

// Initialize
ensureAdmin().then(async (admin) => {
  if (!admin) return;
  
  // Set admin name
  document.getElementById('userName').textContent = admin.username || 'Admin';
  
  // Load and render data
  await loadAndRender();
});

