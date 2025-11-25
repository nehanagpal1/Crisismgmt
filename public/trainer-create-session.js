let allUsers = [];
let teamMemberCount = 0;

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

// Load scenarios (only active ones)
async function loadScenarios() {
  const viewingTrainerId = getViewingTrainerId();
  let url = '/api/trainer/scenarios';
  
  if (viewingTrainerId) {
    url = `/api/admin/trainer/${viewingTrainerId}/scenarios`;
  }
  
  const res = await fetch(url);
  const scenarios = await res.json();
  // Filter to only active scenarios
  return scenarios.filter(s => s.status === 'active');
}

// Load users (only users with role 'user')
async function loadUsers() {
  const res = await fetch('/api/trainer/users');
  const users = await res.json();
  // Filter to only show users with role 'user'
  return users.filter(u => u.role === 'user');
}

// Update team count message
function updateTeamCountMsg() {
  const msg = document.getElementById('teamCountMsg');
  const addBtn = document.getElementById('addTeamMemberBtn');
  msg.textContent = `${teamMemberCount} / 5 members`;
  addBtn.disabled = teamMemberCount >= 5;
  if (teamMemberCount >= 5) {
    msg.style.color = '#f59e0b';
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
  } else {
    msg.style.color = '#64748b';
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
  }
}

// Fill select dropdown
function fillSelect(select, items) {
  select.innerHTML = '';
  if (!items || items.length === 0) {
    const o = document.createElement('option');
    o.disabled = true;
    o.selected = true;
    o.textContent = 'No users found';
    select.appendChild(o);
    return;
  }
  items.forEach(it => {
    const o = document.createElement('option');
    o.value = it._id;
    o.textContent = `${it.username || it.title}${it.role ? ' [' + it.role + ']' : ''}`;
    select.appendChild(o);
  });
}

// Create team member row
function createTeamMemberRow(index) {
  const row = document.createElement('div');
  row.className = 'team-member-row';
  row.setAttribute('data-index', index);
  
  const userSelect = document.createElement('select');
  userSelect.className = 'user-select';
  userSelect.required = true;
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'custom-name';
  nameInput.placeholder = 'Role (optional)';
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove member';
  removeBtn.onclick = () => removeTeamMember(row);
  
  row.appendChild(userSelect);
  row.appendChild(nameInput);
  row.appendChild(removeBtn);
  
  // Populate user dropdown
  fillSelect(userSelect, allUsers);
  
  return row;
}

// Add team member
function addTeamMember() {
  if (teamMemberCount >= 5) {
    alert('Maximum 5 team members allowed');
    return;
  }
  const container = document.getElementById('teamMembersContainer');
  const row = createTeamMemberRow(teamMemberCount);
  container.appendChild(row);
  teamMemberCount++;
  updateTeamCountMsg();
}

// Remove team member
function removeTeamMember(row) {
  row.remove();
  teamMemberCount--;
  updateTeamCountMsg();
}

// Create session
async function createSession(e) {
  e.preventDefault();
  
  const scenarioId = document.getElementById('scenarioSelect').value;
  if (!scenarioId) {
    alert('Please select a scenario');
    return;
  }
  
  // Collect team members
  const teamMembers = [];
  const rows = document.querySelectorAll('.team-member-row');
  rows.forEach(row => {
    const userSelect = row.querySelector('.user-select');
    const customNameInput = row.querySelector('.custom-name');
    if (userSelect && userSelect.value) {
      teamMembers.push({
        userId: userSelect.value,
        customName: customNameInput ? customNameInput.value.trim() : ''
      });
    }
  });
  
  if (teamMembers.length === 0) {
    alert('Please add at least 1 team member');
    return;
  }
  
  if (teamMembers.length > 5) {
    alert('Maximum 5 team members allowed');
    return;
  }
  
  // Check for duplicate users
  const userIds = teamMembers.map(tm => tm.userId);
  const uniqueUserIds = new Set(userIds);
  if (uniqueUserIds.size !== userIds.length) {
    alert('Cannot assign the same user multiple times. Please select different users.');
    return;
  }
  
  try {
    const res = await fetch('/api/trainer/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, teamMembers, status: 'active' })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Failed to create session (${res.status})`);
      return;
    }
    
    alert(`Session created successfully with ${teamMembers.length} participant(s)!`);
    
    // Navigate back with viewAs parameter if present
    const viewingTrainerId = getViewingTrainerId();
    if (viewingTrainerId) {
      location.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    } else {
      location.href = 'trainer-dashboard.html';
    }
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

// Initialize
ensureTrainer().then(async (user) => {
  if (!user) return;
  
  const viewingTrainerId = getViewingTrainerId();
  
  // Update back link
  if (viewingTrainerId) {
    const backLink = document.getElementById('backLink');
    if (backLink) {
      backLink.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    }
  }
  
  // Handle cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (viewingTrainerId) {
      location.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    } else {
      location.href = 'trainer-dashboard.html';
    }
  });
  
  // Load data
  const [scenarios, users] = await Promise.all([
    loadScenarios(),
    loadUsers()
  ]);
  
  allUsers = users;
  
  // Populate scenario dropdown
  const scenarioSelect = document.getElementById('scenarioSelect');
  scenarioSelect.innerHTML = '<option value="">Choose a scenario...</option>';
  scenarios.forEach(s => {
    const o = document.createElement('option');
    o.value = s._id;
    o.textContent = s.title;
    scenarioSelect.appendChild(o);
  });
  
  if (scenarios.length === 0) {
    scenarioSelect.innerHTML = '<option value="">No active scenarios available</option>';
    scenarioSelect.disabled = true;
  }
  
  // Initialize with one team member
  const container = document.getElementById('teamMembersContainer');
  container.innerHTML = '';
  teamMemberCount = 0;
  addTeamMember(); // Start with 1 member
  
  // Form submit
  document.getElementById('createSessionForm').addEventListener('submit', createSession);
  
  // Add team member button
  document.getElementById('addTeamMemberBtn').addEventListener('click', addTeamMember);
}).catch(err => {
  console.error('Error initializing:', err);
});

