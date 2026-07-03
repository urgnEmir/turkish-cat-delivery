# Turkish Cat Delivery 🐾

> A very serious international operation.

A cozy, romantic, cat-themed full-stack web app. I couldn't bring a real cat
from Turkey, so I coded one. Much less illegal, slightly more nerdy.

## Features
- ⏳ Live countdown to arrival in Poland
- 📦 Delivery status bar that fills as the day approaches
- 🛂 **Cat passports** — take a photo (camera or gallery) of a cat and give it a passport
- 🐈 "Ask the cat" random moods + a secret message
- ✅ Shared Poland bucket list (saved in the database, synced across devices)
- 🗣️ Tiny Turkish Survival Kit — add your own words. **Every word = one kiss 💋**, with a running total

## Stack
- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` — file at `data/cats.db`
  (no native module to compile). Requires **Node ≥ 22.5** (stable in Node 24+).
- **Photos:** stored as files in `uploads/`

## Run it
```bash
npm install
npm start
```
Then open http://localhost:3000

## Change the arrival date
Edit one line in `public/app.js`:
```js
const ARRIVAL_DATE = new Date('2027-01-03T12:00:00');
```

## Deploy (Render / Railway)
- Build command: `npm install`
- Start command: `npm start`
- The app reads `PORT` from the environment.
- For photos + database to persist, attach a **persistent disk** and keep
  `data/` and `uploads/` on it (they're created automatically).

---
Made with code, cats, and questionable emotional stability.
