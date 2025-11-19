let user = null;

async function fetchUserInfo() {
    const res = await fetch('/check-session');
    const data = await res.json();
    if (!data.loggedIn) { 
        location.href = '/'; 
        return null; 
    }
    user = data;
    document.getElementById('userInfo').innerHTML = `Logged in as: <strong>${user.username}</strong> <span class='role-badge ${user.role}-badge'>${user.role}</span>`;
    return data;
}

async function fetchMySessions() {
    const res = await fetch('/api/user/my-sessions');
    if (!res.ok) {
        console.error('Failed to fetch sessions');
        return [];
    }
    return await res.json();
}

function renderSessions(sessions) {
    const container = document.getElementById('sessionsContainer');
    
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="no-sessions">No scenarios assigned yet. Please wait for your trainer to assign scenarios.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    sessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        const title = document.createElement('div');
        title.className = 'session-title';
        title.textContent = session.scenarioTitle || 'Untitled Scenario';
        
        const teamInfo = document.createElement('div');
        teamInfo.className = 'team-info';
        if (session.customName) {
            teamInfo.textContent = `Your Role: ${session.customName}`;
        } else {
            teamInfo.textContent = `Team Member`;
        }
        
        const teamSize = document.createElement('div');
        teamSize.style.cssText = 'font-size:14px;color:#666;margin-bottom:8px;';
        teamSize.textContent = `Team Size: ${session.teamSize || 1} member(s)`;
        
        const status = document.createElement('span');
        status.className = `session-status status-${session.status}`;
        status.textContent = session.status.charAt(0).toUpperCase() + session.status.slice(1);
        
        const startBtn = document.createElement('button');
        startBtn.className = 'start-btn';
        startBtn.textContent = session.status === 'active' ? 'Start Game' : 'View Results';
        startBtn.disabled = session.status !== 'active' && session.status !== 'completed';
        
        startBtn.onclick = () => {
            if (session.status === 'active') {
                location.href = `scenario-game.html?sessionId=${session.sessionId}`;
            } else if (session.status === 'completed') {
                alert('This scenario has been completed. View results coming soon!');
            }
        };
        
        card.appendChild(title);
        card.appendChild(teamInfo);
        card.appendChild(teamSize);
        card.appendChild(status);
        card.appendChild(document.createElement('br'));
        card.appendChild(startBtn);
        
        container.appendChild(card);
    });
}

// Logout handler
document.getElementById('logoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/logout', { method: 'POST' });
    location.href = '/';
});

// Initialize
fetchUserInfo().then(() => {
    fetchMySessions().then(sessions => {
        renderSessions(sessions);
    });
});

