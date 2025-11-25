function showLoading(show=true){const o=document.getElementById('loadingOverlay');if(o){if(show){o.classList.remove('hidden');}else{o.classList.add('hidden');}}}
function getViewingTrainerId(){const u=new URLSearchParams(window.location.search);return u.get('viewAs');}

const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');

const getFields = () => ({
  emotionalTone: document.getElementById('emotionalTone').value.trim(),
  cognitiveState: document.getElementById('cognitiveState').value.trim(),
  behaviouralSignals: document.getElementById('behaviouralSignals').value.trim(),
  whatCouldBeBetter: document.getElementById('whatCouldBeBetter').value.trim(),
  teamPerformance: document.getElementById('teamPerformance').value.trim()
});

function fillFields(data) {
  document.getElementById('emotionalTone').value = data?.behaviouralInterpretation?.emotionalTone || '';
  document.getElementById('cognitiveState').value = data?.behaviouralInterpretation?.cognitiveState || '';
  document.getElementById('behaviouralSignals').value = data?.behaviouralInterpretation?.behaviouralSignals || '';
  document.getElementById('whatCouldBeBetter').value = data?.whatCouldBeBetter || '';
  document.getElementById('teamPerformance').value = data?.teamPerformance || '';
}

function displaySessionInfo(session) {
  const details = document.getElementById('sessionDetails');
  const teamMembers = session.teamMembers || [];
  const membersList = teamMembers.map(tm => {
    const username = tm.userId?.username || 'Unknown';
    const customName = tm.customName ? ` (${tm.customName})` : '';
    return `<span class="team-member-pill">${username}${customName}</span>`;
  }).join('');
  
  details.innerHTML = `
    <div><strong>Scenario:</strong> ${session.scenarioId?.title || 'N/A'}</div>
    <div style="margin-top:8px;"><strong>Team Members:</strong><br><div class="team-members-group">${membersList || 'No team members'}</div></div>
    <div style="margin-top:8px;"><strong>Status:</strong> <span style="color:#2196F3;font-weight:600;">${session.status}</span></div>
  `;
}

async function loadResponses() {
  const res = await fetch(`/api/trainer/sessions/${sessionId}/responses`);
  if (!res.ok) return;
  const responses = await res.json();
  
  // Group responses by round
  const responsesByRound = {};
  responses.forEach(r => {
    if (!responsesByRound[r.roundNumber]) {
      responsesByRound[r.roundNumber] = {
        scenario: r.scenarioText,
        responses: []
      };
    }
    responsesByRound[r.roundNumber].responses.push({
      user: r.userId?.username || 'Unknown',
      customName: r.customName || '',
      response: r.userResponse
    });
  });
  
  // Display grouped responses
  const container = document.getElementById('responsesSection');
  container.innerHTML = '';
  
  Object.keys(responsesByRound).sort((a, b) => Number(a) - Number(b)).forEach(roundNum => {
    const roundData = responsesByRound[roundNum];
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round-block';
    const contentId = `round-content-${roundNum}`;
    
    let html = `
      <div class="round-header">
        <div class="round-title">Round ${roundNum}</div>
        <button type="button" class="round-toggle" data-target="${contentId}" aria-expanded="true">
          <span class="toggle-icon">−</span>
          <span class="toggle-text">Collapse</span>
        </button>
      </div>
      <div id="${contentId}" class="round-content">
        <div class="scenario-text">
          <strong>Scenario:</strong><br>${roundData.scenario}
        </div>
        <div class="responses-heading">Team Responses</div>
    `;

    roundData.responses.forEach((resp) => {
      const badge = resp.customName ? `<span class="response-badge">${resp.customName}</span>` : '';
      html += `<div class="response-item">
        <div class="response-user">
          ${resp.user}${badge}
        </div>
        <div class="response-text">${resp.response || '<em>No response</em>'}</div>
      </div>`;
    });

    html += '</div>'; // close round-content
    roundDiv.innerHTML = html;
    container.appendChild(roundDiv);

    const toggleBtn = roundDiv.querySelector('.round-toggle');
    const contentEl = roundDiv.querySelector('.round-content');
    const iconEl = toggleBtn.querySelector('.toggle-icon');
    const textEl = toggleBtn.querySelector('.toggle-text');

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = contentEl.classList.toggle('collapsed');
      toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
      if (isCollapsed) {
        iconEl.textContent = '+';
        textEl.textContent = 'Expand';
      } else {
        iconEl.textContent = '−';
        textEl.textContent = 'Collapse';
      }
    });
  });
  
  if (Object.keys(responsesByRound).length === 0) {
    container.innerHTML = '<p style="color:#999;font-style:italic;">No responses yet.</p>';
  }
}

async function loadForm() {
  if (!sessionId) { alert('No session id in URL'); return; }
  const res = await fetch(`/api/trainer/sessions/${sessionId}`);
  if (!res.ok) { alert('Could not load session'); return; }
  const session = await res.json();
  
  displaySessionInfo(session);
  fillFields(session);
  await loadResponses();
  
  if (session.status === 'completed') {
    document.querySelectorAll('textarea').forEach(f => f.readOnly = true);
    document.getElementById('completeBtn').disabled = true;
  }
}

async function submitAnalysis() {
  const fields = getFields();
  const body = {
    behaviouralInterpretation: {
      emotionalTone: fields.emotionalTone,
      cognitiveState: fields.cognitiveState,
      behaviouralSignals: fields.behaviouralSignals
    },
    whatCouldBeBetter: fields.whatCouldBeBetter,
    teamPerformance: fields.teamPerformance,
    status: 'completed'
  };
  const res = await fetch(`/api/trainer/sessions/${sessionId}/analysis-full`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    alert(err.error || `Failed to submit analysis!`);
    return;
  }
  document.getElementById('feedbackMsg').textContent = 'Analysis submitted and marked complete!';
  
  // Preserve viewAs parameter when redirecting
  const viewingTrainerId=getViewingTrainerId();
  setTimeout(() => {
    if(viewingTrainerId){
      window.location = `trainer-sessions.html?viewAs=${viewingTrainerId}`;
    }else{
      window.location = 'trainer-sessions.html';
    }
  }, 1200);
}

window.addEventListener('DOMContentLoaded', ()=>{
  showLoading(true);
  loadForm().then(()=>showLoading(false)).catch(()=>showLoading(false));
  document.getElementById('completeBtn').onclick = ()=>submitAnalysis();
  
  // Preserve viewAs parameter on back button
  const viewingTrainerId=getViewingTrainerId();
  document.getElementById('backBtn').onclick = ()=>{
    if(viewingTrainerId){
      window.location = `trainer-sessions.html?viewAs=${viewingTrainerId}`;
    }else{
      window.location = 'trainer-sessions.html';
    }
  };
});
