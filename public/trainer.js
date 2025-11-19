let currentFilter = '';

async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) {
    location.href = '/';
    return null;
  }
  return data;
}

async function fetchScenarios() {
  const q = currentFilter ? ('?status=' + encodeURIComponent(currentFilter)) : '';
  const res = await fetch('/api/trainer/scenarios' + q);
  return await res.json();
}

function renderScenarios(list) {
  if (!currentFilter) list = (list || []).filter(s => s.status !== 'archived');
  const holder = document.getElementById('scenarioList');
  const empty = document.getElementById('emptyState');
  holder.innerHTML = '';
  if (!list || list.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  list.forEach(s => {
    const card = document.createElement('div');
    card.style.border = '1px solid #ddd'; card.style.borderRadius = '6px'; card.style.padding = '12px'; card.style.marginBottom = '10px';
    card.innerHTML = `
      <div style=\"display:flex;justify-content:space-between;align-items:center;\">
        <div>
          <div style=\"font-weight:bold;font-size:16px;cursor:pointer;color:#1d5fff;\" data-edit=\"${s._id}\">${s.title}</div>
          <div style=\"font-size:13px;color:#666;\">${s.description || ''}</div>
          <div style=\"margin-top:6px;font-size:12px;\">Status: <strong>${s.status}</strong> • Template: ${s.templateType || 'custom'} • Rounds: ${s.numRounds || 5} • Timer: ${s.responseTimerSec || 120}s</div>
        </div>
        <div style=\"display:flex;gap:8px;\">
          ${s.status !== 'active' ? `<button data-act=\"status\" data-status=\"active\" data-id=\"${s._id}\" style=\"width:auto\">Activate</button>` : ''}
          ${s.status !== 'archived' ? `<button data-act=\"status\" data-status=\"archived\" data-id=\"${s._id}\" style=\"width:auto;background:#555\">Archive</button>` : ''}
          <button data-act=\"delete\" data-id=\"${s._id}\" style=\"width:auto;background:#dc3545;color:white;\">Delete</button>
        </div>
      </div>`;
    holder.appendChild(card);
  });

  holder.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-edit');
      location.href = `trainer-edit-scenario.html?id=${encodeURIComponent(id)}`;
    });
  });

  holder.querySelectorAll('button[data-act="status"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const status = btn.getAttribute('data-status');
      try {
        const res = await fetch(`/api/trainer/scenarios/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
        if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || `Failed (${res.status}) to update scenario`); return; }
        load();
      } catch (e) { alert(e.message || 'Network error'); }
    });
  });

  holder.querySelectorAll('button[data-act="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) return;
      try {
        const res = await fetch(`/api/trainer/scenarios/${id}`, { method:'DELETE' });
        if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || `Failed (${res.status}) to delete scenario`); return; }
        alert('Scenario deleted successfully');
        load();
      } catch (e) { alert(e.message || 'Network error'); }
    });
  });
}

async function load() { const list = await fetchScenarios(); renderScenarios(list); }

ensureTrainer().then(() => {
  document.querySelectorAll('.tabBtn').forEach(btn => { btn.addEventListener('click', () => { currentFilter = btn.getAttribute('data-filter') || ''; load(); });});
  document.getElementById('createScenarioBtn').addEventListener('click', () => { location.href = 'trainer-create-scenario.html'; });
  document.getElementById('createFirstLink').addEventListener('click', (e) => { e.preventDefault(); location.href = 'trainer-create-scenario.html'; });
  document.getElementById('logoutForm')?.addEventListener('submit', async e => { e.preventDefault(); await fetch('/logout', { method: 'POST' }); location.href = '/'; });
  load();
});
