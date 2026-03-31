const screens = {
  home: document.getElementById('screen-home'),
  fillup: document.getElementById('screen-fillup'),
};

const cameraInput = document.getElementById('camera-input');
let activeCameraTarget = null;

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

  const saveBtn = document.getElementById('btn-save');
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        secret: CONFIG.SECRET,
        timestamp,
        mileage: parseFloat(mileage),
        price: parseFloat(price),
        gallons: parseFloat(gallons),
      }),
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    alert(`Saved!\n${timestamp}\n${mileage} mi — ${gallons} gal @ $${price}/gal`);
    clearForm();
    showScreen('home');
  } catch (err) {
    alert('Failed to save: ' + err.message);
  } finally {
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
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
