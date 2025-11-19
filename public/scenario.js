let roundsTotal = 5;
let round = 1;
let timer = 120;
let timerId = null;
let pollTimerId = null;
let currentScenario = '';
let scenarioHistory = [];
let activeSessionId = null;
let isTeamSession = false;
let customName = '';
let hasSubmittedCurrentRound = false;

const scenarioText = document.getElementById('scenarioText');
const roundNum = document.getElementById('roundNum');
const responseForm = document.getElementById('responseForm');
const teamResponse = document.getElementById('teamResponse');
const submitEarlyBtn = document.getElementById('submitEarlyBtn');
const timerView = document.getElementById('timeLeft');
const feedback = document.getElementById('feedback');
const userInfo = document.getElementById('userInfo');
const customRole = document.getElementById('customRole');
const gameContainer = document.getElementById('gameContainer');
const summaryContainer = document.getElementById('summaryContainer');
const summaryRounds = document.getElementById('summaryRounds');
const autoSubmitMsg = document.getElementById('autoSubmitMsg');
const waitingMsg = document.getElementById('waitingMsg');

let user = null;

// Get sessionId from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const sessionIdParam = urlParams.get('sessionId');

async function fetchUserInfo() {
    const res = await fetch('/check-session');
    const data = await res.json();
    if (!data.loggedIn) { location.href = '/'; return; }
    user = data;
    userInfo.innerHTML = `Logged in as: <strong>${user.username}</strong> <span class='role-badge ${user.role}-badge'>${user.role}</span>`;
}

async function fetchSessionById(sessionId) {
    const res = await fetch(`/api/user/session/${sessionId}`);
    if (!res.ok) {
        scenarioText.textContent = 'Session not found or access denied.';
        responseForm.style.display = 'none';
        document.getElementById('timer').style.display = 'none';
        return false;
    }
    const data = await res.json();
    
    activeSessionId = data.sessionId;
    currentScenario = data.initialText;
    roundsTotal = data.numRounds || 5;
    timer = data.responseTimerSec || 120;
    isTeamSession = data.isTeamSession || false;
    customName = data.customName || '';
    round = data.currentRound || 1;
    
    // Show custom role/name at top if assigned
    if (customName) {
        customRole.textContent = `Your Role: ${customName}`;
        customRole.style.display = 'block';
    }
    
    scenarioHistory = [{ scenario: currentScenario, response: null }];
    scenarioText.textContent = currentScenario;
    roundNum.textContent = round;
    return true;
}

function startTimer() {
    let secondsLeft = timer;
    timerView.textContent = secondsLeft;
    clearInterval(timerId);
    autoSubmitMsg.style.display = 'none';
    teamResponse.disabled = false;
    submitEarlyBtn.disabled = false;
    hasSubmittedCurrentRound = false;
    
    timerId = setInterval(() => {
        secondsLeft--;
        timerView.textContent = secondsLeft;
        
        // Show warning in last 10 seconds
        if (secondsLeft <= 10 && secondsLeft > 0 && !hasSubmittedCurrentRound) {
            autoSubmitMsg.style.display = 'block';
        }
        
        // Time's up - force submit if not already submitted
        if (secondsLeft <= 0) {
            clearInterval(timerId);
            autoSubmitMsg.style.display = 'none';
            
            if (!hasSubmittedCurrentRound) {
                teamResponse.disabled = true;
                feedback.textContent = 'Time is up! Auto-submitting...';
                setTimeout(() => { submitCurrentResponse(); }, 500);
            } else {
                // Already submitted but timer expired while waiting
                feedback.textContent = 'Time is up! Waiting for next scenario...';
            }
        }
    }, 1000);
}

function nextRound(newScenario) {
    clearInterval(timerId);
    clearInterval(pollTimerId);
    
    round++;
    if (round > roundsTotal) { showSummary(); return; }
    
    roundNum.textContent = round;
    currentScenario = newScenario;
    feedback.textContent = '';
    waitingMsg.style.display = 'none';
    scenarioText.textContent = newScenario;
    teamResponse.value = '';
    teamResponse.disabled = false;
    hasSubmittedCurrentRound = false;
    
    startTimer();
}

async function submitCurrentResponse() {
    if (hasSubmittedCurrentRound) return; // Prevent double submission
    
    hasSubmittedCurrentRound = true;
    teamResponse.disabled = true;
    submitEarlyBtn.disabled = true;
    autoSubmitMsg.style.display = 'none';
    
    const response = teamResponse.value.trim() || '[No input]';
    scenarioHistory[scenarioHistory.length - 1].response = response;
    feedback.textContent = 'Submitting your response...';
    
    try {
        const res = await fetch('/api/user/submit-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: activeSessionId, 
                roundNumber: round, 
                prevScenario: currentScenario, 
                userResponse: response 
            })
        });
        const data = await res.json();
        
        if (data.completed) { 
            clearInterval(timerId);
            clearInterval(pollTimerId);
            feedback.textContent = 'Session completed!';
            setTimeout(() => showSummary(), 1000);
            return; 
        }
        
        if (data.waiting) {
            // Show waiting message - timer continues running
            waitingMsg.textContent = data.message || 'Waiting for other team members...';
            waitingMsg.style.display = 'block';
            feedback.textContent = 'Response submitted! Timer continues while waiting...';
            pollForNextScenario();
        } else if (data.nextScenario) {
            // All team members already submitted - proceed immediately
            scenarioHistory.push({ scenario: data.nextScenario, response: null });
            setTimeout(() => nextRound(data.nextScenario), 500);
        }
    } catch (e) {
        feedback.textContent = 'Server error! Try refreshing.';
        console.error('Submit error:', e);
        hasSubmittedCurrentRound = false;
        teamResponse.disabled = false;
        submitEarlyBtn.disabled = false;
    }
}

// Poll backend to check if next scenario is ready
async function pollForNextScenario() {
    clearInterval(pollTimerId);
    pollTimerId = setInterval(async () => {
        try {
            const res = await fetch(`/api/user/check-next-scenario?sessionId=${activeSessionId}&round=${round}`);
            const data = await res.json();
            
            if (data.ready && data.nextScenario) {
                clearInterval(pollTimerId);
                clearInterval(timerId);
                waitingMsg.style.display = 'none';
                scenarioHistory.push({ scenario: data.nextScenario, response: null });
                setTimeout(() => nextRound(data.nextScenario), 500);
            } else if (data.completed) {
                clearInterval(pollTimerId);
                clearInterval(timerId);
                waitingMsg.style.display = 'none';
                showSummary();
            }
        } catch (e) {
            console.error('Poll error:', e);
        }
    }, 3000); // Poll every 3 seconds
}

// Allow manual submission by pressing Enter or a button if we add one
responseForm.addEventListener('submit', function(e) { 
    e.preventDefault();
    if (!hasSubmittedCurrentRound) {
        submitCurrentResponse();
    }
});

// Allow early submission with Ctrl+Enter
teamResponse.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter' && !hasSubmittedCurrentRound) {
        e.preventDefault();
        submitCurrentResponse();
    }
});

function showSummary() {
    clearInterval(timerId);
    clearInterval(pollTimerId);
    gameContainer.style.display = 'none';
    summaryContainer.style.display = 'block';
    let html = '<h3>Your Responses:</h3>';
    scenarioHistory.forEach((entry, idx) => {
        html += `<div style="margin-bottom:20px;padding:12px;border:1px solid #ddd;border-radius:6px;">
            <strong>Round ${idx + 1}:</strong><br>
            <em>Scenario:</em> ${entry.scenario}<br>
            <em>Your Response:</em> ${entry.response || 'No response'}
        </div>`;
    });
    summaryRounds.innerHTML = html;
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    location.href = '/';
}

document.getElementById('logoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    logout();
});

// Initialize
fetchUserInfo().then(async () => {
    if (!sessionIdParam) {
        scenarioText.textContent = 'No session selected. Please go back to your dashboard.';
        responseForm.style.display = 'none';
        document.getElementById('timer').style.display = 'none';
        return;
    }
    
    const success = await fetchSessionById(sessionIdParam);
    if (success) {
        startTimer();
    }
});
