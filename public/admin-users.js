let allUsers = [];
let filteredUsers = [];

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

// Load all users
async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Failed to load users');
    const users = await res.json();
    return users;
  } catch (err) {
    console.error('Error loading users:', err);
    return [];
  }
}

// Calculate stats
function calculateStats(users) {
  const total = users.length;
  const admins = users.filter(u => u.role === 'admin').length;
  const trainers = users.filter(u => u.role === 'trainer').length;
  const regularUsers = users.filter(u => u.role === 'user').length;
  
  return { total, admins, trainers, regularUsers };
}

// Update stats display
function updateStats(stats) {
  document.getElementById('totalUsers').textContent = stats.total;
  document.getElementById('adminCount').textContent = stats.admins;
  document.getElementById('trainerCount').textContent = stats.trainers;
  document.getElementById('userCount').textContent = stats.regularUsers;
}

// Render users table
function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '';
  
  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-text">No users found</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  users.forEach(user => {
    const tr = document.createElement('tr');
    
    const roleClass = `role-${user.role}`;
    const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    
    tr.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td>${user.email || 'N/A'}</td>
      <td><span class="role-badge ${roleClass}">${user.role}</span></td>
      <td>${createdDate}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-edit" onclick="openEditModal('${user._id}')">Edit</button>
          <button class="btn-delete" onclick="deleteUser('${user._id}', '${user.username}')">Delete</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Filter and search users
function filterUsers() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const roleFilter = document.getElementById('roleFilter').value;
  
  filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm) || 
                         (user.email && user.email.toLowerCase().includes(searchTerm));
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  renderUsers(filteredUsers);
}

// Create new user
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const feedback = document.getElementById('createFeedback');
  const formData = new FormData(e.target);
  const userData = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role')
  };
  
  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      feedback.className = 'success';
      feedback.textContent = `✓ User "${userData.username}" created successfully!`;
      e.target.reset();
      
      // Reload users
      await loadAndRenderUsers();
      
      setTimeout(() => {
        feedback.style.display = 'none';
      }, 3000);
    } else {
      feedback.className = 'error';
      feedback.textContent = `✗ ${data.message || 'Failed to create user'}`;
    }
  } catch (err) {
    feedback.className = 'error';
    feedback.textContent = `✗ Network error: ${err.message}`;
  }
});

// Open edit modal
function openEditModal(userId) {
  const user = allUsers.find(u => u._id === userId);
  if (!user) return;
  
  document.getElementById('editUserId').value = user._id;
  document.getElementById('editUsername').value = user.username;
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editRole').value = user.role;
  document.getElementById('editPassword').value = '';
  
  document.getElementById('editModal').classList.add('show');
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
}

// Edit user
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('editUserId').value;
  const updateData = {
    email: document.getElementById('editEmail').value,
    role: document.getElementById('editRole').value
  };
  
  const newPassword = document.getElementById('editPassword').value;
  if (newPassword) {
    updateData.password = newPassword;
  }
  
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (res.ok) {
      alert('User updated successfully!');
      closeEditModal();
      await loadAndRenderUsers();
    } else {
      const data = await res.json();
      alert(`Failed to update user: ${data.message || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
});

// Delete user
async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
    return;
  }
  
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      alert(`User "${username}" deleted successfully!`);
      await loadAndRenderUsers();
    } else {
      const data = await res.json();
      alert(`Failed to delete user: ${data.message || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
}

// Load and render all users
async function loadAndRenderUsers() {
  allUsers = await loadUsers();
  filteredUsers = allUsers;
  
  const stats = calculateStats(allUsers);
  updateStats(stats);
  renderUsers(filteredUsers);
}

// Search and filter event listeners
document.getElementById('searchInput').addEventListener('input', filterUsers);
document.getElementById('roleFilter').addEventListener('change', filterUsers);

// Close modal on outside click
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') {
    closeEditModal();
  }
});

// Initialize
ensureAdmin().then(async (admin) => {
  if (!admin) return;
  await loadAndRenderUsers();
});

