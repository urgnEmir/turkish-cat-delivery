'use strict';

/* =========================================================================
 * Turkish Cat Delivery — front-end
 * ========================================================================= */

/* -------------------------------------------------------------------------
 * ⚙️  EASY TO CHANGE: the day Emir arrives in Poland.
 * Format: 'YYYY-MM-DDTHH:MM:SS' (24h, local time). Change this one line.
 * ------------------------------------------------------------------------- */
const ARRIVAL_DATE = new Date('2027-03-01T12:00:00');

/* The countdown "window" (for the delivery status bar): the bar fills from
 * this start date up to arrival. Set to when the gift was made. */
const DELIVERY_START = new Date('2026-07-03T00:00:00');

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
  $('#statusCat').style.left = pct + '%';

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
  const img = el.querySelector('img.passport-photo');
  if (img) img.addEventListener('click', () => openLightbox(cat.photoUrl, cat.name));

  el.querySelector('.del').addEventListener('click', async () => {
    if (!confirm(`Remove ${cat.name} from the operation?`)) return;
    await api(`/api/cats/${cat.id}`, { method: 'DELETE' });
    loadCats();
  });
  return el;
}

/* Photo lightbox — tap a passport photo to see it full-size */
function openLightbox(url, caption) {
  $('#lightboxImg').src = url;
  $('#lightboxImg').alt = caption || '';
  $('#lightboxCaption').textContent = caption || '';
  const box = $('#lightbox');
  box.classList.add('open');
  box.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  const box = $('#lightbox');
  box.classList.remove('open');
  box.setAttribute('aria-hidden', 'true');
  $('#lightboxImg').src = '';
}
$('#lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox' || e.target.hasAttribute('data-close')) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#lightbox').classList.contains('open')) closeLightbox();
});

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
      <button class="del" title="Remove" aria-label="Remove">×</button>
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
        if (box.checked) {
          const r = box.getBoundingClientRect();
          burstHearts(r.left + r.width / 2, r.top);
        }
      } catch (e) {
        box.checked = !box.checked; // revert on failure
        alert(e.message);
      }
    });
    li.querySelector('.del').addEventListener('click', async () => {
      if (!confirm(`Remove “${item.label}” from the list?`)) return;
      try {
        await api(`/api/checklist/${item.id}`, { method: 'DELETE' });
        li.remove();
        updateListProgress();
      } catch (e) {
        alert(e.message);
      }
    });
    ul.appendChild(li);
  });
  updateListProgress();
}

// add a new checklist item
$('#listForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#listInput');
  const label = input.value.trim();
  if (!label) return;
  try {
    await api('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    input.value = '';
    await loadChecklist();
  } catch (ex) {
    alert(ex.message);
  }
});

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
    floatKiss();
  } catch (ex) {
    err.textContent = ex.message;
  }
});

/* =========================================================================
 * Cute particle effects
 * ========================================================================= */
function burstHearts(x, y, count = 6) {
  const emojis = ['💛', '💗', '✨', '🐾'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = emojis[i % emojis.length];
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    p.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
    p.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

function floatKiss() {
  const badge = $('.kiss-badge');
  const rect = badge.getBoundingClientRect();
  const k = document.createElement('span');
  k.className = 'kiss-float';
  k.textContent = '+1 💋';
  k.style.left = rect.left + rect.width / 2 - 20 + 'px';
  k.style.top = rect.top + 'px';
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 1400);
}

// a little burst when tapping the kiss badge, just because
$('.kiss-badge').addEventListener('click', (e) => burstHearts(e.clientX, e.clientY, 8));

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
