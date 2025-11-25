function getViewingTrainerId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('viewAs');
}

async function ensureTrainer() {
  const res = await fetch('/check-session');
  const data = await res.json();
  if (!data.loggedIn || (data.role !== 'trainer' && data.role !== 'admin')) {
    location.href = '/';
    return null;
  }
  return data;
}

ensureTrainer().then(() => {
  // Update back link to preserve viewAs parameter
  const viewingTrainerId = getViewingTrainerId();
  if (viewingTrainerId) {
    const backLink = document.querySelector('a[href="trainer-dashboard.html"]');
    if (backLink) {
      backLink.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    }
  }
  
  // Handle cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (viewingTrainerId) {
      location.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
    } else {
      location.href = 'trainer-dashboard.html';
    }
  });
});

// 1. Track which button was used
let saveAsDraft = false;

// 2. Attach event to Save as Draft
const saveDraftBtn = document.getElementById('saveDraftBtn');
if (saveDraftBtn) {
  saveDraftBtn.addEventListener('click', () => {
    saveAsDraft = true;
    document.getElementById('createScenarioForm').dispatchEvent(new Event('submit', { cancelable: true }));
  });
}

// Update main submit listener
const scenarioForm = document.getElementById('createScenarioForm');
if (scenarioForm) {
  scenarioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.numRounds = Number(payload.numRounds || 5);
    payload.responseTimerSec = Number(payload.responseTimerSec || 120);
    payload.active = !saveAsDraft; // true if Create, false if Draft
    try {
      const res = await fetch('/api/trainer/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Failed (${res.status}) to create scenario`);
        saveAsDraft = false;
        return;
      }

      // Preserve viewAs parameter when redirecting
      const viewingTrainerId = getViewingTrainerId();
      if (viewingTrainerId) {
        location.href = `trainer-dashboard.html?viewAs=${viewingTrainerId}`;
      } else {
        location.href = 'trainer-dashboard.html';
      }
    } catch (err) {
      alert(err.message || 'Network error');
    }
    saveAsDraft = false;
  });
}
