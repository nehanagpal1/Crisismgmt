function getQuery(name){const u=new URL(location.href);return u.searchParams.get(name);}

async function ensureTrainer(){const r=await fetch('/check-session');const d=await r.json();if(!d.loggedIn||(d.role!=='trainer'&&d.role!=='admin')){location.href='/';return null;}return d;}

async function loadResponses(id){const r=await fetch(`/api/trainer/sessions/${id}/responses`);if(!r.ok){document.getElementById('info').textContent='Not found';return [];}return await r.json();}

async function loadSession(id){const r=await fetch(`/api/trainer/sessions/${id}`);if(!r.ok)return null;return await r.json();}

function displayAnalysis(session) {
  const analysisDiv = document.getElementById('analysisSection');
  if (!session || !session.behaviouralInterpretation || session.status === 'submitted' || session.status === 'active') {
    analysisDiv.innerHTML = '<p style="color:#888;font-style:italic;">Pending Analysis</p>';
    return;
  }
  const bi = session.behaviouralInterpretation || {};
  let html = '<div style="border:1px solid #ddd;padding:16px;border-radius:8px;background:#fafbff;">';
  html += '<h3>1. Behavioural Interpretation</h3>';
  html += `<p><strong>Emotional Tone:</strong> ${bi.emotionalTone || 'N/A'}</p>`;
  html += `<p><strong>Cognitive State:</strong> ${bi.cognitiveState || 'N/A'}</p>`;
  html += `<p><strong>Behavioural Signals:</strong> ${bi.behaviouralSignals || 'N/A'}</p>`;
  html += '<h3 style="margin-top:16px;">2. What could have been better</h3>';
  html += `<p>${session.whatCouldBeBetter || 'N/A'}</p>`;
  html += '<h3 style="margin-top:16px;">3. How each team performed</h3>';
  html += `<p>${session.teamPerformance || 'N/A'}</p>`;
  html += '</div>';
  analysisDiv.innerHTML = html;
}

ensureTrainer().then(async ()=>{
  const id=getQuery('sessionId');
  if(!id){document.getElementById('info').textContent='Missing sessionId';return;}
  const [rows, session] = await Promise.all([loadResponses(id), loadSession(id)]);
  const body=document.getElementById('respBody');
  body.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.roundNumber}</td><td>${r.scenarioText}</td><td>${r.userResponse}</td>`;
    body.appendChild(tr);
  });
  displayAnalysis(session);
});


