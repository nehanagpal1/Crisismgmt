function showLoading(show = true) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

function getQuery(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function ensureUser() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || data.role !== 'user') {
    location.href = '/';
    return null;
  }
  return data;
}

async function loadSessionDetail(id) {
  const res = await fetch(`/api/user/sessions/${id}/detail`);
  if (!res.ok) return null;
  return res.json();
}

async function loadResponses(id) {
  const res = await fetch(`/api/user/sessions/${id}/responses`);
  if (!res.ok) return [];
  return res.json();
}

function renderSessionInfo(session) {
  const info = document.getElementById('info');
  if (!session) {
    info.textContent = 'Session not found or you do not have access.';
    return;
  }

  const members = (session.teamMembers || [])
    .map(tm => tm.customName || tm.username || 'Participant')
    .join(', ');

  info.innerHTML = `
    <div><strong>Scenario:</strong> ${session.scenario?.title || 'Untitled Scenario'}</div>
    <div style="margin-top:8px;"><strong>Status:</strong> <span style="color:#60a5fa;font-weight:600;">${session.status}</span></div>
    <div style="margin-top:8px;"><strong>Team Members:</strong> ${members || 'Not available'}</div>
  `;
}

function renderResponses(rows) {
  const body = document.getElementById('respBody');
  body.innerHTML = '';

  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;color:#94a3b8;padding:32px;">No responses recorded yet.</td>
      </tr>
    `;
    return;
  }

  rows.forEach(row => {
    const responder = row.customName || row.userId?.username || 'Participant';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.roundNumber}</td>
      <td>${row.scenarioText || ''}</td>
      <td><strong>${responder}:</strong> ${row.userResponse || ''}</td>
    `;
    body.appendChild(tr);
  });
}

function renderAnalysis(session) {
  const analysisDiv = document.getElementById('analysisSection');
  if (!session || !session.behaviouralInterpretation || session.status === 'active' || session.status === 'submitted') {
    analysisDiv.innerHTML = '<p style="color:#888;font-style:italic;text-align:center;">Trainer analysis has not been published yet.</p>';
    return;
  }

  const bi = session.behaviouralInterpretation || {};
  analysisDiv.innerHTML = `
    <h3>1. Behavioural Interpretation</h3>
    <p><strong>Emotional Tone:</strong> ${bi.emotionalTone || 'N/A'}</p>
    <p><strong>Cognitive State:</strong> ${bi.cognitiveState || 'N/A'}</p>
    <p><strong>Behavioural Signals:</strong> ${bi.behaviouralSignals || 'N/A'}</p>
    <h3 style="margin-top:16px;">2. What could have been better</h3>
    <p>${session.whatCouldBeBetter || 'N/A'}</p>
    <h3 style="margin-top:16px;">3. How each team performed</h3>
    <p>${session.teamPerformance || 'N/A'}</p>
  `;
}

showLoading(true);
ensureUser().then(async (user) => {
  if (!user) return;
  const sessionId = getQuery('sessionId');
  if (!sessionId) {
    document.getElementById('info').textContent = 'Missing sessionId parameter.';
    showLoading(false);
    return;
  }

  const [responses, session] = await Promise.all([
    loadResponses(sessionId),
    loadSessionDetail(sessionId)
  ]);

  renderSessionInfo(session);
  renderResponses(responses);
  renderAnalysis(session);
  showLoading(false);
}).catch(() => showLoading(false));

