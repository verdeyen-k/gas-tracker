const screens = {
  home: document.getElementById('screen-home'),
  fillup: document.getElementById('screen-fillup'),
};

const cameraInput = document.getElementById('camera-input');
let activeCameraTarget = null;

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// Navigation
document.getElementById('btn-new-fillup').addEventListener('click', () => showScreen('fillup'));
document.getElementById('btn-cancel').addEventListener('click', () => {
  clearForm();
  showScreen('home');
});

// Camera buttons
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

  // Show image preview
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
      preview.querySelector('.ocr-result').textContent = 'Could not read value — enter manually';
    }
  } catch (err) {
    preview.querySelector('.ocr-result').textContent = 'OCR failed — enter manually';
  } finally {
    btn.classList.remove('loading');
    cameraInput.value = '';
  }
});

// Save
document.getElementById('btn-save').addEventListener('click', async () => {
  const mileage = document.getElementById('input-mileage').value.trim();
  const gallons = document.getElementById('input-gallons').value.trim();
  const price = document.getElementById('input-price').value.trim();

  if (!mileage || !gallons || !price) {
    alert('Please fill in all three fields.');
    return;
  }

  const row = {
    date: new Date().toISOString().split('T')[0],
    mileage: parseFloat(mileage),
    gallons: parseFloat(gallons),
    pricePerGallon: parseFloat(price),
  };

  console.log('Saving row:', row);
  // TODO: send to Google Sheets

  alert(`Saved!\n${row.date} — ${row.mileage} mi, ${row.gallons} gal @ $${row.pricePerGallon}`);
  clearForm();
  showScreen('home');
});

function clearForm() {
  ['mileage', 'gallons', 'price'].forEach(field => {
    document.getElementById(`input-${field}`).value = '';
    const preview = document.getElementById(`preview-${field}`);
    preview.innerHTML = '';
    preview.classList.add('hidden');
  });
}

// Start on home screen
showScreen('home');
