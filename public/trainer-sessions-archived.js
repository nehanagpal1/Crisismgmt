async function ensureTrainer(){const r=await fetch('/check-session');const d=await r.json();if(!d.loggedIn||(d.role!=='trainer'&&d.role!=='admin')){location.href='/';return null;}return d;}
async function loadArchived(){const r=await fetch('/api/trainer/sessions-archived');return await r.json();}

ensureTrainer().then(async ()=>{
  const rows = await loadArchived();
  const body = document.getElementById('archBody');
  body.innerHTML = '';
  rows.forEach(s=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${s.scenarioId?.title||''}</td><td>${s.userId?.username||''}</td><td><span class="session-status status-${s.status}">${s.status}</span></td>
      <td>
        <button data-act="view" data-id="${s._id}" class="btn-info" style="width:auto;font-size:12px;padding:8px 14px;">Response and Analysis</button>
        <button data-act="delete" data-id="${s._id}" class="btn-danger" style="width:auto;font-size:12px;padding:8px 14px;">Delete</button>
      </td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('button[data-act="view"]').forEach(btn=>{
    btn.addEventListener('click',()=>{const id=btn.getAttribute('data-id');location.href=`trainer-session-responses.html?sessionId=${encodeURIComponent(id)}`;});
  });
  body.querySelectorAll('button[data-act="delete"]').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      const id=btn.getAttribute('data-id');
      if(!confirm('Are you sure you want to delete this session? This will also delete all associated responses. This action cannot be undone.')) return;
      try {
        const res=await fetch(`/api/trainer/sessions/${id}`,{method:'DELETE'});
        if(!res.ok){const err=await res.json().catch(()=>({}));alert(err.error||`Failed (${res.status}) to delete session`);return;}
        alert('Session deleted successfully');
        location.reload();
      } catch(e){alert(e.message||'Network error');}
    });
  });
});
