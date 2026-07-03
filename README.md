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

## Deploy to Render
A `render.yaml` blueprint is included.

1. Push this repo to GitHub (done).
2. Go to https://dashboard.render.com → **New +** → **Blueprint**.
3. Connect the `turkish-cat-delivery` repo. Render reads `render.yaml` and
   creates the service. Click **Apply**.
4. Open the URL Render gives you (e.g. `https://turkish-cat-delivery.onrender.com`).

### ⚠️ Persistence
On the **free** plan the filesystem is ephemeral: uploaded photos and the
SQLite database reset on every redeploy/restart, and the service sleeps after
~15 min idle (first visit after that is slow).

To keep data **forever**, edit `render.yaml`: switch to `plan: starter`, then
uncomment the `STORAGE_DIR` env var and the `disk:` block. That single disk
(mounted at `/var/data`) holds both `cats.db` and the photos.

### Env vars
- `PORT` — set automatically by the host.
- `STORAGE_DIR` — base folder for `data/` + `uploads/` (default: project dir).

---
Made with code, cats, and questionable emotional stability.
