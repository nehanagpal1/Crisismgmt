let user = null;

async function fetchUserInfo() {
    const res = await fetch('/check-session');
    const data = await res.json();
    if (!data.loggedIn) { 
        location.href = '/'; 
        return null; 
    }
    user = data;
    
    // Update header user info
    document.getElementById('userName').textContent = user.username || 'Participant';
    document.getElementById('welcomeName').textContent = user.username || 'Participant';
    
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
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No scenarios assigned yet</div>
                <div class="empty-state-subtext">Please wait for your trainer to assign scenarios</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // Update welcome team info with first session's custom name
    if (sessions[0] && sessions[0].customName) {
        document.getElementById('userTeam').textContent = sessions[0].customName;
        document.getElementById('welcomeTeam').textContent = sessions[0].customName;
    }
    
    sessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        const isActive = session.status === 'active';
        const isCompleted = session.status === 'completed' || session.status === 'submitted';
        
        card.innerHTML = `
            <div class="session-header">
                <div class="session-info">
                    <h3>${session.scenarioTitle || 'Untitled Scenario'}</h3>
                    <div class="session-meta">
                        <span class="session-status status-${session.status}">
                            ${session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                    </div>
                    <div class="session-meta">
                        ${session.customName ? `Your Role: ${session.customName}` : 'Team Member'}
                    </div>
                    <div class="participants-info">
                        ${session.teamSize || 1} team member${(session.teamSize || 1) > 1 ? 's' : ''} ${isActive ? 'active' : 'in this session'}
                    </div>
                </div>
                <div class="session-actions">
                    ${isActive ? '<span class="badge-live">Live</span>' : ''}
                    <button class="btn-join" 
                            onclick="joinSession('${session.sessionId}', '${session.status}')"
                            ${!isActive && !isCompleted ? 'disabled' : ''}>
                        ${isActive ? 'Join Session' : isCompleted ? 'View Results' : 'Not Available'}
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function joinSession(sessionId, status) {
    if (status === 'active') {
        location.href = `scenario-game.html?sessionId=${sessionId}`;
    } else if (status === 'completed' || status === 'submitted' || status === 'analysing' || status === 'pending_analysis') {
        location.href = `user-session-responses.html?sessionId=${sessionId}`;
    }
}

// Logout handler
document.getElementById('logoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/logout', { method: 'POST' });
    location.href = '/';
});

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

// Initialize
showLoading(true);
fetchUserInfo().then(() => {
    fetchMySessions().then(sessions => {
        renderSessions(sessions);
        showLoading(false);
    }).catch(err => {
        console.error('Error loading sessions:', err);
        showLoading(false);
    });
}).catch(err => {
    console.error('Error loading user info:', err);
    showLoading(false);
});
