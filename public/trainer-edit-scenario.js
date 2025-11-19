function q(name){const u=new URL(location.href);return u.searchParams.get(name);} 
async function ensureTrainer(){const r=await fetch('/check-session');const d=await r.json();if(!d.loggedIn||(d.role!=='trainer'&&d.role!=='admin')){location.href='/';return null;}return d;}
async function loadScenario(id){const r=await fetch(`/api/trainer/scenarios/${id}`);return await r.json();}
async function updateScenario(id, body){return fetch(`/api/trainer/scenarios/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}

ensureTrainer().then(async()=>{
  const id=q('id'); if(!id){document.getElementById('editNote').textContent='Missing scenario id'; return;}
  const data=await loadScenario(id); if(data.error){document.getElementById('editNote').textContent=data.error; return;}
  const s=data.scenario; let editable=data.editable;

  const form=document.getElementById('editForm');
  const $ = sel => form.querySelector(sel);
  const fTitle = $('[name="title"]');
  const fDesc = $('[name="description"]');
  const fInit = $('[name="initialText"]');
  const fRounds = $('[name="numRounds"]');
  const fTimer = $('[name="responseTimerSec"]');
  const fTemplate = $('[name="templateType"]');
  const saveBtn = document.getElementById('saveBtn');

  // Prefill with saved values
  fTitle.value = s.title || '';
  fDesc.value = s.description || '';
  fInit.value = s.initialText || '';
  fRounds.value = s.numRounds || 5;
  fTimer.value = s.responseTimerSec || 120;
  fTemplate.value = s.templateType || 'custom';

  if(!editable){
    document.getElementById('editNote').textContent='Scenario is locked because it has active session(s). You can view but not edit.';
    [fTitle,fDesc,fInit,fRounds,fTimer,fTemplate].forEach(el=>el.disabled=true);
    saveBtn.disabled = true;
  } else {
    document.getElementById('editNote').textContent='You can edit this scenario.';
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!editable){ alert('Scenario is locked due to active session(s).'); return; }
    const payload={
      title: fTitle.value.trim(),
      description: fDesc.value.trim(),
      initialText: fInit.value.trim(),
      numRounds: Number(fRounds.value||5),
      responseTimerSec: Number(fTimer.value||120),
      templateType: fTemplate.value
    };
    const res=await updateScenario(id,payload);
    if(!res.ok){const err=await res.json().catch(()=>({}));alert(err.error||`Failed (${res.status}) to save`);return;}
    location.href='trainer-dashboard.html';
  });
});
