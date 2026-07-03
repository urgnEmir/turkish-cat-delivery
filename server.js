'use strict';

/**
 * Turkish Cat Delivery — backend
 * A very serious international operation, powered by Node + Express + MongoDB.
 *
 * All data (cats, words, checklist) and cat photos live in MongoDB, so nothing
 * is lost across Render redeploys, restarts, or sleeps — no persistent disk needed.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const multer = require('multer');
const { mongoose, Cat, Word, ChecklistItem } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Add it to your .env file.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Seed data (only when a collection is empty)
// ---------------------------------------------------------------------------
async function seed() {
  if ((await Cat.countDocuments()) === 0) {
    await Cat.create({
      name: 'Istanbul Cat',
      origin: 'Türkiye',
      destination: 'Poland',
      mission: 'Make her smile until Emir arrives',
      personality: 'sleepy, dramatic, affectionate, slightly judgmental',
      favoriteFood: 'attention',
    });
  }

  if ((await Word.countDocuments()) === 0) {
    await Word.insertMany([
      { turkish: 'Merhaba', meaning: 'Hello' },
      { turkish: 'Kedi', meaning: 'Cat' },
      { turkish: 'Özledim', meaning: 'I missed you' },
      { turkish: 'Güzel', meaning: 'Beautiful' },
      { turkish: 'Kahve', meaning: 'Coffee' },
    ]);
  }

  if ((await ChecklistItem.countDocuments()) === 0) {
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
    await ChecklistItem.insertMany(items.map((label, i) => ({ label, sortOrder: i })));
  }
}

// ---------------------------------------------------------------------------
// Photo uploads — kept in memory, then stored as binary in MongoDB
// ---------------------------------------------------------------------------
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

const upload = multer({
  storage: multer.memoryStorage(),
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
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// API: cats
// ---------------------------------------------------------------------------
app.get('/api/cats', async (req, res, next) => {
  try {
    const cats = await Cat.find().sort({ createdAt: 1, _id: 1 });
    res.json(cats.map(serializeCat));
  } catch (e) {
    next(e);
  }
});

app.post('/api/cats', upload.single('photo'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = (b.name || '').trim();
    if (!name) return res.status(400).json({ error: 'A cat needs a name.' });

    const cat = await Cat.create({
      name,
      origin: (b.origin || 'Türkiye').trim(),
      destination: (b.destination || 'Poland').trim(),
      mission: (b.mission || '').trim(),
      personality: (b.personality || '').trim(),
      favoriteFood: (b.favorite_food || 'attention').trim(),
      photo: req.file ? { data: req.file.buffer, contentType: req.file.mimetype } : undefined,
    });
    res.status(201).json(serializeCat(cat));
  } catch (e) {
    next(e);
  }
});

// Serve a cat photo straight from MongoDB.
app.get('/api/cats/:id/photo', async (req, res, next) => {
  try {
    const cat = await Cat.findById(req.params.id).select('photo');
    if (!cat || !cat.photo || !cat.photo.data) return res.status(404).end();
    res.set('Content-Type', cat.photo.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=604800');
    res.send(cat.photo.data);
  } catch (e) {
    if (e instanceof mongoose.Error.CastError) return res.status(404).end();
    next(e);
  }
});

app.delete('/api/cats/:id', async (req, res, next) => {
  try {
    const cat = await Cat.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Cat not found.' });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Cat not found.' });
    next(e);
  }
});

// ---------------------------------------------------------------------------
// API: words (each word = one kiss)
// ---------------------------------------------------------------------------
app.get('/api/words', async (req, res, next) => {
  try {
    const words = await Word.find().sort({ createdAt: 1, _id: 1 });
    res.json({ words: words.map((w) => w.toJSON()), kisses: words.length });
  } catch (e) {
    next(e);
  }
});

app.post('/api/words', async (req, res, next) => {
  try {
    const turkish = (req.body.turkish || '').trim();
    const meaning = (req.body.meaning || '').trim();
    if (!turkish || !meaning) {
      return res.status(400).json({ error: 'Both the Turkish word and its meaning are required.' });
    }
    const word = await Word.create({ turkish, meaning });
    const kisses = await Word.countDocuments();
    res.status(201).json({ word: word.toJSON(), kisses });
  } catch (e) {
    next(e);
  }
});

app.delete('/api/words/:id', async (req, res, next) => {
  try {
    const word = await Word.findByIdAndDelete(req.params.id);
    if (!word) return res.status(404).json({ error: 'Word not found.' });
    const kisses = await Word.countDocuments();
    res.json({ ok: true, kisses });
  } catch (e) {
    if (e instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Word not found.' });
    next(e);
  }
});

// ---------------------------------------------------------------------------
// API: checklist
// ---------------------------------------------------------------------------
app.get('/api/checklist', async (req, res, next) => {
  try {
    const items = await ChecklistItem.find().sort({ sortOrder: 1, _id: 1 });
    res.json(items.map(serializeChecklist));
  } catch (e) {
    next(e);
  }
});

app.post('/api/checklist', async (req, res, next) => {
  try {
    const label = (req.body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Write something to add first.' });
    const last = await ChecklistItem.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    const item = await ChecklistItem.create({ label, sortOrder: (last ? last.sortOrder : -1) + 1 });
    res.status(201).json(serializeChecklist(item));
  } catch (e) {
    next(e);
  }
});

app.patch('/api/checklist/:id', async (req, res, next) => {
  try {
    const checked = !!req.body.checked;
    const item = await ChecklistItem.findByIdAndUpdate(req.params.id, { checked }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json({ ok: true, id: item.id, checked: item.checked });
  } catch (e) {
    if (e instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Item not found.' });
    next(e);
  }
});

app.delete('/api/checklist/:id', async (req, res, next) => {
  try {
    const item = await ChecklistItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Item not found.' });
    next(e);
  }
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
    favoriteFood: cat.favoriteFood,
    photoUrl: cat.photo && cat.photo.data ? `/api/cats/${cat.id}/photo` : null,
    createdAt: cat.createdAt,
  };
}

function serializeChecklist(item) {
  return { id: item.id, label: item.label, checked: item.checked, sort_order: item.sortOrder };
}

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || (err && err.message)) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  await seed();
  app.listen(PORT, () => {
    console.log(`🐾 Turkish Cat Delivery running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
