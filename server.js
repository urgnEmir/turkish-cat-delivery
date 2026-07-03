'use strict';

/**
 * Turkish Cat Delivery — backend
 * A very serious international operation, powered by Node + Express + SQLite.
 *
 * Data lives in ./data/cats.db, cat photos live in ./uploads.
 * Nothing here is illegal. Slightly more nerdy than a real cat.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// STORAGE_DIR lets a host mount a single persistent disk that holds both the
// database and the photos. Defaults to the project dir for local dev.
const STORAGE_DIR = process.env.STORAGE_DIR || __dirname;
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const db = new DatabaseSync(path.join(DATA_DIR, 'cats.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS cats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    origin        TEXT NOT NULL DEFAULT 'Türkiye',
    destination   TEXT NOT NULL DEFAULT 'Poland',
    mission       TEXT NOT NULL DEFAULT '',
    personality   TEXT NOT NULL DEFAULT '',
    favorite_food TEXT NOT NULL DEFAULT 'attention',
    photo         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS words (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    turkish    TEXT NOT NULL,
    meaning    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checklist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      TEXT NOT NULL,
    checked    INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`);

// ---------------------------------------------------------------------------
// Seed data (only on first run)
// ---------------------------------------------------------------------------
function seed() {
  const catCount = db.prepare('SELECT COUNT(*) AS n FROM cats').get().n;
  if (catCount === 0) {
    db.prepare(`
      INSERT INTO cats (name, origin, destination, mission, personality, favorite_food, photo)
      VALUES (@name, @origin, @destination, @mission, @personality, @favorite_food, @photo)
    `).run({
      name: 'Istanbul Cat',
      origin: 'Türkiye',
      destination: 'Poland',
      mission: 'Make her smile until Emir arrives',
      personality: 'sleepy, dramatic, affectionate, slightly judgmental',
      favorite_food: 'attention',
      photo: null,
    });
  }

  const wordCount = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  if (wordCount === 0) {
    const insert = db.prepare('INSERT INTO words (turkish, meaning) VALUES (?, ?)');
    const seedWords = [
      ['Merhaba', 'Hello'],
      ['Kedi', 'Cat'],
      ['Özledim', 'I missed you'],
      ['Güzel', 'Beautiful'],
      ['Kahve', 'Coffee'],
    ];
    seedWords.forEach((r) => insert.run(r[0], r[1]));
  }

  const listCount = db.prepare('SELECT COUNT(*) AS n FROM checklist').get().n;
  if (listCount === 0) {
    const insert = db.prepare('INSERT INTO checklist (label, sort_order) VALUES (?, ?)');
    const items = [
      'Walk around Radom',
      'Make a birthday cake together',
      'Go to a concert in Warsaw or Kraków',
      'Try Polish food',
      'Cook something Turkish',
      'Take silly photos',
      'Drink coffee together',
      'Plan a small trip to Prague or Vienna',
      'Watch a cozy movie',
      'Teach each other Turkish and Polish words',
    ];
    items.forEach((label, i) => insert.run(label, i));
  }
}
seed();

// ---------------------------------------------------------------------------
// Photo uploads
// ---------------------------------------------------------------------------
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `cat-${id}${ext || '.jpg'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB — cats are not that big
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg, png, webp, gif, heic).'));
  },
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// API: cats
// ---------------------------------------------------------------------------
app.get('/api/cats', (req, res) => {
  const cats = db.prepare('SELECT * FROM cats ORDER BY created_at ASC, id ASC').all();
  res.json(cats.map(serializeCat));
});

app.post('/api/cats', upload.single('photo'), (req, res) => {
  const b = req.body || {};
  const name = (b.name || '').trim();
  if (!name) {
    if (req.file) safeUnlink(req.file.filename);
    return res.status(400).json({ error: 'A cat needs a name.' });
  }
  const info = db.prepare(`
    INSERT INTO cats (name, origin, destination, mission, personality, favorite_food, photo)
    VALUES (@name, @origin, @destination, @mission, @personality, @favorite_food, @photo)
  `).run({
    name,
    origin: (b.origin || 'Türkiye').trim(),
    destination: (b.destination || 'Poland').trim(),
    mission: (b.mission || '').trim(),
    personality: (b.personality || '').trim(),
    favorite_food: (b.favorite_food || 'attention').trim(),
    photo: req.file ? req.file.filename : null,
  });
  const cat = db.prepare('SELECT * FROM cats WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeCat(cat));
});

app.delete('/api/cats/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM cats WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Cat not found.' });
  db.prepare('DELETE FROM cats WHERE id = ?').run(req.params.id);
  if (cat.photo) safeUnlink(cat.photo);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API: words (each word = one kiss)
// ---------------------------------------------------------------------------
app.get('/api/words', (req, res) => {
  const words = db.prepare('SELECT * FROM words ORDER BY created_at ASC, id ASC').all();
  res.json({ words, kisses: words.length });
});

app.post('/api/words', (req, res) => {
  const turkish = (req.body.turkish || '').trim();
  const meaning = (req.body.meaning || '').trim();
  if (!turkish || !meaning) {
    return res.status(400).json({ error: 'Both the Turkish word and its meaning are required.' });
  }
  const info = db.prepare('INSERT INTO words (turkish, meaning) VALUES (?, ?)').run(turkish, meaning);
  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(info.lastInsertRowid);
  const kisses = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  res.status(201).json({ word, kisses });
});

app.delete('/api/words/:id', (req, res) => {
  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id);
  if (!word) return res.status(404).json({ error: 'Word not found.' });
  db.prepare('DELETE FROM words WHERE id = ?').run(req.params.id);
  const kisses = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  res.json({ ok: true, kisses });
});

// ---------------------------------------------------------------------------
// API: checklist
// ---------------------------------------------------------------------------
app.get('/api/checklist', (req, res) => {
  const items = db.prepare('SELECT id, label, checked, sort_order FROM checklist ORDER BY sort_order ASC, id ASC').all();
  res.json(items.map((i) => ({ ...i, checked: !!i.checked })));
});

app.patch('/api/checklist/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM checklist WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  const checked = req.body.checked ? 1 : 0;
  db.prepare('UPDATE checklist SET checked = ? WHERE id = ?').run(checked, req.params.id);
  res.json({ ok: true, id: item.id, checked: !!checked });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function serializeCat(cat) {
  return {
    id: cat.id,
    name: cat.name,
    origin: cat.origin,
    destination: cat.destination,
    mission: cat.mission,
    personality: cat.personality,
    favoriteFood: cat.favorite_food,
    photoUrl: cat.photo ? `/uploads/${cat.photo}` : null,
    createdAt: cat.created_at,
  };
}

function safeUnlink(filename) {
  // Never let a crafted filename escape the uploads dir.
  const target = path.join(UPLOADS_DIR, path.basename(filename));
  fs.unlink(target, () => {});
}

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`🐾 Turkish Cat Delivery running at http://localhost:${PORT}`);
});
