let accessToken = null;

const screens = {
  home: document.getElementById('screen-home'),
  fillup: document.getElementById('screen-fillup'),
};

const cameraInput = document.getElementById('camera-input');
let activeCameraTarget = null;

// ── Auth ──────────────────────────────────────────────────────────────────────

function initAuth() {
  const stored = sessionStorage.getItem('gas_tracker_token');
  if (stored) {
    accessToken = stored;
    onSignedIn();
  }
}

function onSignedIn() {
  document.getElementById('btn-signin').classList.add('hidden');
  document.getElementById('btn-signout').classList.remove('hidden');
  document.getElementById('btn-new-fillup').classList.remove('hidden');
  document.getElementById('auth-status').textContent = 'Signed in';
}

function onSignedOut() {
  accessToken = null;
  sessionStorage.removeItem('gas_tracker_token');
  document.getElementById('btn-signin').classList.remove('hidden');
  document.getElementById('btn-signout').classList.add('hidden');
  document.getElementById('btn-new-fillup').classList.add('hidden');
  document.getElementById('auth-status').textContent = '';
}

document.getElementById('btn-signin').addEventListener('click', () => {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: (response) => {
      if (response.error) {
        alert('Sign-in failed: ' + response.error);
        return;
      }
      accessToken = response.access_token;
      sessionStorage.setItem('gas_tracker_token', accessToken);
      onSignedIn();
    },
  });
  client.requestAccessToken();
});

document.getElementById('btn-signout').addEventListener('click', () => {
  google.accounts.oauth2.revoke(accessToken, () => onSignedOut());
});

// ── Navigation ────────────────────────────────────────────────────────────────

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

document.getElementById('btn-new-fillup').addEventListener('click', () => showScreen('fillup'));
document.getElementById('btn-cancel').addEventListener('click', () => {
  clearForm();
  showScreen('home');
});

// ── Camera / OCR ──────────────────────────────────────────────────────────────

document.querySelectorAll('.btn-camera').forEach(btn => {
  btn.addEventListener('click', () => {
    activeCameraTarget = btn.dataset.target;
    cameraInput.click();
  });
});

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !activeCameraTarget) return;

  const target = activeCameraTarget;
  const btn = document.querySelector(`.btn-camera[data-target="${target}"]`);
  const preview = document.getElementById(`preview-${target}`);

  const url = URL.createObjectURL(file);
  preview.innerHTML = `<img src="${url}"><div class="ocr-result">Reading...</div>`;
  preview.classList.remove('hidden');
  btn.classList.add('loading');

  try {
    const result = await Tesseract.recognize(file, 'eng', {
      tessedit_char_whitelist: '0123456789.',
    });

    const text = result.data.text.trim();
    const numbers = text.match(/\d+\.?\d*/g);
    const value = numbers ? numbers[0] : '';

    if (value) {
      document.getElementById(`input-${target}`).value = value;
      preview.querySelector('.ocr-result').textContent = `Detected: ${value}`;
    } else {
      preview.querySelector('.ocr-result').textContent = 'Could not read — enter manually';
    }
  } catch {
    preview.querySelector('.ocr-result').textContent = 'OCR failed — enter manually';
  } finally {
    btn.classList.remove('loading');
    cameraInput.value = '';
  }
});

// ── Save to Google Sheets ─────────────────────────────────────────────────────

document.getElementById('btn-save').addEventListener('click', async () => {
  const mileage = document.getElementById('input-mileage').value.trim();
  const gallons = document.getElementById('input-gallons').value.trim();
  const price = document.getElementById('input-price').value.trim();

  if (!mileage || !gallons || !price) {
    alert('Please fill in all three fields.');
    return;
  }

  const now = new Date();
  const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toTimeString().slice(0, 8)}`;

  const row = [timestamp, parseFloat(mileage), parseFloat(price), parseFloat(gallons)];

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(CONFIG.SHEET_NAME)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Sheets API error');
    }

    alert(`Saved!\n${timestamp}\n${mileage} mi — ${gallons} gal @ $${price}/gal`);
    clearForm();
    showScreen('home');
  } catch (err) {
    alert('Failed to save: ' + err.message);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearForm() {
  ['mileage', 'gallons', 'price'].forEach(field => {
    document.getElementById(`input-${field}`).value = '';
    const preview = document.getElementById(`preview-${field}`);
    preview.innerHTML = '';
    preview.classList.add('hidden');
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

showScreen('home');
initAuth();
