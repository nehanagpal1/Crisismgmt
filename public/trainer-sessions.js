let currentUserId = null;
let allUsers = [];
let teamMemberCount = 0;

async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) { location.href = '/'; return null; }
  return data;
}

function updateTeamCountMsg() {
  const msg = document.getElementById('teamCountMsg');
  const addBtn = document.getElementById('addTeamMemberBtn');
  msg.textContent = `${teamMemberCount} member(s) added`;
  addBtn.disabled = teamMemberCount >= 5;
  if (teamMemberCount >= 5) {
    msg.textContent += ' (Maximum reached)';
    msg.style.color = '#e74c3c';
  } else {
    msg.style.color = '#666';
  }
}

function createTeamMemberRow(index) {
  const row = document.createElement('div');
  row.className = 'team-member-row';
  row.style.cssText = 'display:flex;gap:10px;margin-bottom:8px;align-items:center;';
  row.setAttribute('data-index', index);
  
  const userLabel = document.createElement('label');
  userLabel.style.flex = '1';
  userLabel.innerHTML = `User ${index + 1}: <select class="user-select" style="width:100%;padding:6px;"></select>`;
  
  const nameLabel = document.createElement('label');
  nameLabel.style.flex = '1';
  nameLabel.innerHTML = `Custom Name/Role: <input type="text" class="custom-name" placeholder="e.g., Team Leader" style="width:100%;padding:6px;">`;
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.style.cssText = 'width:32px;height:32px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;';
  removeBtn.onclick = () => removeTeamMember(row);
  
  row.appendChild(userLabel);
  row.appendChild(nameLabel);
  row.appendChild(removeBtn);
  
  // Populate user dropdown
  const select = row.querySelector('.user-select');
  fillSelect(select, allUsers);
  
  return row;
}

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

function removeTeamMember(row) {
  row.remove();
  teamMemberCount--;
  // Re-index remaining rows
  document.querySelectorAll('.team-member-row').forEach((r, idx) => {
    r.setAttribute('data-index', idx);
    const label = r.querySelector('label');
    if (label) label.childNodes[0].textContent = `User ${idx + 1}: `;
  });
  updateTeamCountMsg();
}

async function loadScenarios() { const res = await fetch('/api/trainer/scenarios'); return await res.json(); }
async function loadUsers() { const res = await fetch('/api/trainer/users'); return await res.json(); }
async function loadSessions() { const res = await fetch('/api/trainer/sessions'); return await res.json(); }

function fillSelect(select, items) {
  select.innerHTML = '';
  if (!items || items.length === 0) { const o=document.createElement('option'); o.disabled=true;o.selected=true;o.textContent='No users found. Create a user and refresh'; select.appendChild(o); return; }
  items.forEach(it => { const o=document.createElement('option'); o.value=it._id; o.textContent=`${it.username || it.title}${it.role? ' ['+it.role+']':''}`; select.appendChild(o); });
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
  const [scenarios, users, sessions] = await Promise.all([loadScenarios(), loadUsers(), loadSessions()]);
  allUsers = users; // Store for dynamic team member creation
  
  const scenarioSel=document.getElementById('scenarioSelect'); scenarioSel.innerHTML=''; scenarios.forEach(s=>{const o=document.createElement('option');o.value=s._id;o.textContent=s.title;scenarioSel.appendChild(o);});
  
  // Initialize with one team member
  const container = document.getElementById('teamMembersContainer');
  container.innerHTML = '';
  teamMemberCount = 0;
  addTeamMember(); // Start with 1 member

  const tbody = document.getElementById('sessionsBody');
  tbody.innerHTML = '';
  sessions.forEach(s => {
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
        window.location = `trainer-analysis.html?sessionId=${encodeURIComponent(id)}`;
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
    btn.addEventListener('click', () => { const id=btn.getAttribute('data-id'); location.href=`trainer-session-responses.html?sessionId=${encodeURIComponent(id)}`; });
  });
}

async function createSession() {
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
    
    alert(`Team session created successfully with ${teamMembers.length} member(s)!`);
    render();
  } catch (e) {
    alert(e.message || 'Network error');
  }
}

ensureTrainer().then(() => { 
  document.getElementById('createSessionBtn').addEventListener('click', createSession); 
  document.getElementById('refreshBtn').addEventListener('click', render); 
  document.getElementById('addTeamMemberBtn').addEventListener('click', addTeamMember);
  render(); 
});
