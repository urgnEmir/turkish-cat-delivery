'use strict';

/**
 * Turkish Cat Delivery — Mongoose models.
 *
 * Everything that used to live in SQLite (cats, words, checklist) and on the
 * local filesystem (cat photos) now lives in MongoDB, so it survives Render
 * redeploys, restarts, and sleeps without a persistent disk.
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// A tiny toJSON transform that gives every document a plain `id` string and
// drops Mongo internals — keeps the existing front-end (which reads `.id`)
// working unchanged.
function baseTransform(doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

const catSchema = new Schema(
  {
    name: { type: String, required: true },
    origin: { type: String, default: 'Türkiye' },
    destination: { type: String, default: 'Poland' },
    mission: { type: String, default: '' },
    personality: { type: String, default: '' },
    favoriteFood: { type: String, default: 'attention' },
    // Photo is stored inline as binary so it persists in the DB (no disk).
    photo: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const wordSchema = new Schema(
  {
    turkish: { type: String, required: true },
    meaning: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const checklistSchema = new Schema(
  {
    label: { type: String, required: true },
    checked: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: false }
);

[catSchema, wordSchema, checklistSchema].forEach((s) => {
  s.set('toJSON', { transform: baseTransform });
  s.set('toObject', { transform: baseTransform });
});

const Cat = mongoose.model('Cat', catSchema);
const Word = mongoose.model('Word', wordSchema);
const ChecklistItem = mongoose.model('ChecklistItem', checklistSchema);

module.exports = { mongoose, Cat, Word, ChecklistItem };
