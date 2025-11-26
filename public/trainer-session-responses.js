function showLoading(show=true){const o=document.getElementById('loadingOverlay');if(o){if(show){o.classList.remove('hidden');}else{o.classList.add('hidden');}}}
function getQuery(name){const u=new URL(location.href);return u.searchParams.get(name);}
function getViewingTrainerId(){const u=new URLSearchParams(window.location.search);return u.get('viewAs');}

async function ensureTrainer(){const r=await fetch('/check-session');const d=await r.json();if(!d.loggedIn||(d.role!=='trainer'&&d.role!=='admin')){location.href='/';return null;}return d;}

async function loadResponses(id){const r=await fetch(`/api/trainer/sessions/${id}/responses`);if(!r.ok){document.getElementById('info').textContent='Not found';return [];}return await r.json();}

async function loadSession(id){
  const r=await fetch(`/api/trainer/sessions/${id}`);
  if(!r.ok)return null;
  return await r.json();
}

function displayAnalysis(session) {
  const analysisDiv = document.getElementById('analysisSection');
  if (!session || !session.behaviouralInterpretation || session.status === 'submitted' || session.status === 'active') {
    analysisDiv.innerHTML = '<p style="color:#888;font-style:italic;">Pending Analysis</p>';
    return;
  }
  const bi = session.behaviouralInterpretation || {};
  let html = '<div style="border:1px solid #2d3748;padding:20px;border-radius:12px;background:#1a1f2e;color:#e2e8f0;">';
  html += '<h3 style="font-size:16px;color:#3b82f6;margin:0 0 12px 0;">1. Behavioural Interpretation</h3>';
  html += `<p style="color:#94a3b8;margin:8px 0;"><strong style="color:#cbd5e1;">Emotional Tone:</strong> ${bi.emotionalTone || 'N/A'}</p>`;
  html += `<p style="color:#94a3b8;margin:8px 0;"><strong style="color:#cbd5e1;">Cognitive State:</strong> ${bi.cognitiveState || 'N/A'}</p>`;
  html += `<p style="color:#94a3b8;margin:8px 0;"><strong style="color:#cbd5e1;">Behavioural Signals:</strong> ${bi.behaviouralSignals || 'N/A'}</p>`;
  html += '<h3 style="font-size:16px;color:#3b82f6;margin:20px 0 12px 0;">2. What could have been better</h3>';
  html += `<p style="color:#94a3b8;margin:8px 0;">${session.whatCouldBeBetter || 'N/A'}</p>`;
  html += '<h3 style="font-size:16px;color:#3b82f6;margin:20px 0 12px 0;">3. How each team performed</h3>';
  html += `<p style="color:#94a3b8;margin:8px 0;">${session.teamPerformance || 'N/A'}</p>`;
  html += '</div>';
  analysisDiv.innerHTML = html;
}

showLoading(true);
ensureTrainer().then(async ()=>{
  // Update navigation links to preserve viewAs parameter
  const viewingTrainerId=getViewingTrainerId();
  if(viewingTrainerId){
    const dashboardLink=document.getElementById('dashboardLink');
    const sessionsLink=document.getElementById('sessionsLink');
    if(dashboardLink){dashboardLink.href=`trainer-dashboard.html?viewAs=${viewingTrainerId}`;}
    if(sessionsLink){sessionsLink.href=`trainer-sessions.html?viewAs=${viewingTrainerId}`;}
  }
  
  const id=getQuery('sessionId');
  if(!id){document.getElementById('info').textContent='Missing sessionId';showLoading(false);return;}
  const [rows, session] = await Promise.all([loadResponses(id), loadSession(id)]);
  if(session){
    const teamMembers = (session.teamMembers || [])
      .map(tm => tm.customName || tm.userId?.username || 'Participant')
      .join(', ');
    const infoDiv=document.getElementById('info');
    if(infoDiv){
      infoDiv.innerHTML=`
        <div><strong>Scenario:</strong> ${session.scenarioId?.title || 'Untitled Scenario'}</div>
        <div style="margin-top:8px;"><strong>Status:</strong> ${session.status || 'N/A'}</div>
        <div style="margin-top:8px;"><strong>Team:</strong> ${teamMembers || 'N/A'}</div>
      `;
    }
  }
  const body=document.getElementById('respBody');
  body.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.roundNumber}</td><td>${r.scenarioText}</td><td>${r.userResponse}</td>`;
    body.appendChild(tr);
  });
  displayAnalysis(session);
  showLoading(false);
}).catch(()=>showLoading(false));


