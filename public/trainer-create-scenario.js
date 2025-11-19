async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) {
    location.href = '/';
    return null;
  }
  return data;
}

ensureTrainer();

document.getElementById('createScenarioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.numRounds = Number(payload.numRounds || 5);
  payload.responseTimerSec = Number(payload.responseTimerSec || 120);
  try {
    const res = await fetch('/api/trainer/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || `Failed (${res.status}) to create scenario`);
      return;
    }
    location.href = 'trainer-dashboard.html';
  } catch (err) {
    alert(err.message || 'Network error');
  }
});
