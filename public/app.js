'use strict';

/* =========================================================================
 * Turkish Cat Delivery — front-end
 * ========================================================================= */

/* -------------------------------------------------------------------------
 * ⚙️  EASY TO CHANGE: the day Emir arrives in Poland.
 * Format: 'YYYY-MM-DDTHH:MM:SS' (24h, local time). Change this one line.
 * ------------------------------------------------------------------------- */
const ARRIVAL_DATE = new Date('2027-01-03T12:00:00');

/* The countdown "window" (for the delivery status bar): from now-ish start
 * to arrival. We anchor the start ~6 months before arrival. */
const DELIVERY_START = new Date(ARRIVAL_DATE.getTime() - 183 * 24 * 60 * 60 * 1000);

const CAT_MESSAGES = [
  'The cat says: she should smile today.',
  'The cat says: Polish weather is scary, bring snacks.',
  'The cat says: Emir is trying his best, unfortunately.',
  'The cat says: today is a good day to send him a cute message.',
  'The cat says: this is not a real cat, but it has real feelings. Probably.',
  'The cat says: you are being adorable and it is mildly annoying.',
  'The cat says: nap now, conquer the world later.',
  'The cat says: Türkiye misses you too, in a very cat-like way.',
];

const SECRET_MESSAGE =
  'Real cat or not, I still want to make cute memories with you in Poland. 💛';

const $ = (sel) => document.querySelector(sel);

/* =========================================================================
 * API helpers
 * ========================================================================= */
async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* =========================================================================
 * Countdown
 * ========================================================================= */
function updateCountdown() {
  const now = new Date();
  let diff = Math.max(0, ARRIVAL_DATE - now);

  const day = 86400000, hour = 3600000, minute = 60000;
  const days = Math.floor(diff / day); diff -= days * day;
  const hours = Math.floor(diff / hour); diff -= hours * hour;
  const minutes = Math.floor(diff / minute); diff -= minutes * minute;
  const seconds = Math.floor(diff / 1000);

  $('#cdDays').textContent = days;
  $('#cdHours').textContent = String(hours).padStart(2, '0');
  $('#cdMinutes').textContent = String(minutes).padStart(2, '0');
  $('#cdSeconds').textContent = String(seconds).padStart(2, '0');

  const text = $('#countdownText');
  if (ARRIVAL_DATE - now <= 0) {
    text.textContent = 'Emir is in Poland. Mission accomplished 🐾💛';
  } else {
    text.textContent = `${days} days until Emir comes to Poland 🐾`;
  }
}

/* =========================================================================
 * Delivery status bar — progresses with the countdown
 * ========================================================================= */
function updateDeliveryStatus() {
  const now = Date.now();
  const total = ARRIVAL_DATE - DELIVERY_START;
  const elapsed = now - DELIVERY_START;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  $('#statusFill').style.width = pct + '%';

  // 4 steps → active step based on progress
  const activeStep = Math.min(3, Math.floor(pct / 25));
  document.querySelectorAll('#statusSteps li').forEach((li) => {
    const step = Number(li.dataset.step);
    li.classList.toggle('active', step === activeStep);
    li.classList.toggle('done', step < activeStep);
  });
}

/* =========================================================================
 * Cat passports
 * ========================================================================= */
async function loadCats() {
  const cats = await api('/api/cats');
  const grid = $('#passportGrid');
  grid.innerHTML = '';
  cats.forEach((cat) => grid.appendChild(renderPassport(cat)));
}

function renderPassport(cat) {
  const el = document.createElement('article');
  el.className = 'passport';
  const photo = cat.photoUrl
    ? `<img class="passport-photo" src="${escapeHtml(cat.photoUrl)}" alt="${escapeHtml(cat.name)}" />`
    : `<div class="passport-photo placeholder">🐱</div>`;

  el.innerHTML = `
    ${photo}
    <h3>${escapeHtml(cat.name)}</h3>
    <dl>
      <dt>From</dt><dd>${escapeHtml(cat.origin)}</dd>
      <dt>To</dt><dd>${escapeHtml(cat.destination)}</dd>
      ${cat.mission ? `<dt>Mission</dt><dd>${escapeHtml(cat.mission)}</dd>` : ''}
      ${cat.personality ? `<dt>Personality</dt><dd>${escapeHtml(cat.personality)}</dd>` : ''}
      <dt>Favorite food</dt><dd>${escapeHtml(cat.favoriteFood)}</dd>
    </dl>
    <button class="del" data-id="${cat.id}">remove</button>
  `;
  el.querySelector('.del').addEventListener('click', async () => {
    if (!confirm(`Remove ${cat.name} from the operation?`)) return;
    await api(`/api/cats/${cat.id}`, { method: 'DELETE' });
    loadCats();
  });
  return el;
}

/* =========================================================================
 * Words + kisses
 * ========================================================================= */
async function loadWords() {
  const { words, kisses } = await api('/api/words');
  $('#kissCount').textContent = kisses;
  const grid = $('#wordGrid');
  grid.innerHTML = '';
  words.forEach((w) => grid.appendChild(renderWord(w)));
}

function renderWord(w) {
  const el = document.createElement('div');
  el.className = 'word';
  el.innerHTML = `
    <span class="kiss">💋</span>
    <div class="tr">${escapeHtml(w.turkish)}</div>
    <div class="en">= ${escapeHtml(w.meaning)}</div>
    <button class="del" data-id="${w.id}">remove</button>
  `;
  el.querySelector('.del').addEventListener('click', async () => {
    const { kisses } = await api(`/api/words/${w.id}`, { method: 'DELETE' });
    $('#kissCount').textContent = kisses;
    loadWords();
  });
  return el;
}

/* =========================================================================
 * Checklist
 * ========================================================================= */
async function loadChecklist() {
  const items = await api('/api/checklist');
  const ul = $('#checklist');
  ul.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = item.checked ? 'checked' : '';
    li.innerHTML = `
      <input type="checkbox" id="chk-${item.id}" ${item.checked ? 'checked' : ''} />
      <label for="chk-${item.id}">${escapeHtml(item.label)}</label>
    `;
    const box = li.querySelector('input');
    box.addEventListener('change', async () => {
      try {
        await api(`/api/checklist/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checked: box.checked }),
        });
        li.classList.toggle('checked', box.checked);
        updateListProgress();
      } catch (e) {
        box.checked = !box.checked; // revert on failure
        alert(e.message);
      }
    });
    ul.appendChild(li);
  });
  updateListProgress();
}

function updateListProgress() {
  const boxes = document.querySelectorAll('#checklist input');
  const done = document.querySelectorAll('#checklist input:checked').length;
  const note = $('#listProgress');
  if (!boxes.length) { note.textContent = ''; return; }
  if (done === boxes.length) note.textContent = '🎉 All done — best Erasmus ever.';
  else note.textContent = `${done} / ${boxes.length} memories planned 💫`;
}

/* =========================================================================
 * Cat mood + secret message
 * ========================================================================= */
function setBubble(text) {
  const bubble = $('#catBubble');
  bubble.textContent = text;
  bubble.classList.remove('pop');
  void bubble.offsetWidth; // restart animation
  bubble.classList.add('pop');
}

$('#askCatBtn').addEventListener('click', () => {
  const msg = CAT_MESSAGES[Math.floor(Math.random() * CAT_MESSAGES.length)];
  setBubble(msg);
});

$('#secretBtn').addEventListener('click', () => setBubble(SECRET_MESSAGE));

/* =========================================================================
 * Modals
 * ========================================================================= */
function openModal(id) { $(id).classList.add('open'); $(id).setAttribute('aria-hidden', 'false'); }
function closeModal(el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }

document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.hasAttribute('data-close')) closeModal(modal);
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(closeModal);
});

$('#addCatBtn').addEventListener('click', () => openModal('#catModal'));
$('#addWordBtn').addEventListener('click', () => openModal('#wordModal'));

// photo preview
$('#catPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = $('#catPhotoPreview');
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
});

// add cat
$('#catForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#catFormError');
  const submit = $('#catSubmit');
  err.textContent = '';
  submit.disabled = true;
  try {
    const fd = new FormData(e.target);
    await api('/api/cats', { method: 'POST', body: fd });
    e.target.reset();
    $('#catPhotoPreview').hidden = true;
    closeModal($('#catModal'));
    await loadCats();
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    submit.disabled = false;
  }
});

// add word
$('#wordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#wordFormError');
  err.textContent = '';
  try {
    const fd = new FormData(e.target);
    const { kisses } = await api('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turkish: fd.get('turkish'), meaning: fd.get('meaning') }),
    });
    $('#kissCount').textContent = kisses;
    e.target.reset();
    closeModal($('#wordModal'));
    await loadWords();
  } catch (ex) {
    err.textContent = ex.message;
  }
});

/* =========================================================================
 * Floating paw prints
 * ========================================================================= */
function spawnPaws() {
  const container = $('.paws');
  const paws = ['🐾', '🐾', '🐱', '💛'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.textContent = paws[i % paws.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.fontSize = 1 + Math.random() * 1.6 + 'rem';
    s.style.animationDuration = 12 + Math.random() * 16 + 's';
    s.style.animationDelay = -Math.random() * 20 + 's';
    container.appendChild(s);
  }
}

/* =========================================================================
 * Boot
 * ========================================================================= */
function boot() {
  spawnPaws();
  updateCountdown();
  updateDeliveryStatus();
  setInterval(updateCountdown, 1000);
  setInterval(updateDeliveryStatus, 60000);

  loadCats().catch((e) => console.error('cats', e));
  loadWords().catch((e) => console.error('words', e));
  loadChecklist().catch((e) => console.error('checklist', e));
}

boot();
