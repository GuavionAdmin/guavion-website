# Waitlist: Full setup guide

Get the waitlist form saving to Postgres on Railway.

---

## 1. Postgres: create the table

In **Railway** → your project → **Postgres** → **Data** (or use **Query** in the Postgres dashboard), run:

```sql
CREATE TABLE IF NOT EXISTS waitlist (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT,
  role       TEXT,
  interest   TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);
```

---

## 2. Backend on Railway: add the endpoint

Your backend must:

- Accept **POST** requests to **`/api/waitlist`**
- Read JSON: `{ name, email, company?, role?, interest?, message? }`
- Insert a row into the `waitlist` table
- Send **CORS** headers so the website (different origin) can call it

### Option A: You already have a Node/Express backend

1. Install pg: `npm install pg`
2. In Railway, add the **Postgres** service to the same project as your backend and connect it (Railway sets `DATABASE_URL`).
3. Add a route like this (adjust to your app structure):

```javascript
// Example: in your Express app
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // or your frontend URL
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email, company, role, interest, message } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }
    await pool.query(
      `INSERT INTO waitlist (name, email, company, role, interest, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, company || null, role || null, interest || null, message || null]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save' });
  }
});
```

4. Redeploy the backend on Railway.

### Option B: New minimal backend (Node + Express)

Use the `server/` folder in this repo (see below). Deploy that as a **new Railway service**, connect Postgres to it, and Railway will set `DATABASE_URL`.

---

## 3. Railway: get your backend URL

1. Open your project on [Railway](https://railway.app).
2. Click your **backend service** (the one that runs the API).
3. Go to **Settings** → **Networking** → **Generate Domain** (or use the one you have).
4. Copy the URL, e.g. `https://your-app-name.up.railway.app` (no trailing slash).

This is the URL the frontend will call.

---

## 4. Frontend: point the site at your backend

The site uses the env variable **`VITE_API_URL`** for the backend. Set it when you **build** the frontend (and when your host runs the build).

### Build locally

```bash
cd "Guavion Website"
VITE_API_URL=https://your-app-name.up.railway.app npm run build
```

Then deploy the contents of the `dist/` folder to Vercel, Netlify, GitHub Pages, etc.

### Build on Vercel / Netlify / etc.

1. In the dashboard, open your **frontend** project.
2. **Settings** → **Environment variables**.
3. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-app-name.up.railway.app` (your Railway backend URL, no trailing slash)
4. Trigger a new deploy (e.g. push to Git or “Redeploy”).

After redeploy, the waitlist form will POST to your Railway backend and rows will go to Postgres.

---

## 5. Quick checklist

- [ ] Postgres: `waitlist` table created (step 1)
- [ ] Backend: POST `/api/waitlist` implemented and CORS enabled (step 2)
- [ ] Backend and Postgres on Railway: same project, `DATABASE_URL` set (step 2)
- [ ] Backend URL copied from Railway (step 3)
- [ ] `VITE_API_URL` set to that URL when building/deploying the frontend (step 4)

---

## Troubleshooting

- **CORS errors in browser:** Backend must send `Access-Control-Allow-Origin` (and allow `Content-Type`). Use your real frontend origin in production instead of `*` if you want to lock it down.
- **403 / 401:** Backend or Railway might be behind auth; for a public waitlist, the endpoint should be unauthenticated.
- **“Something went wrong”:** Check Railway logs for the backend and Postgres; confirm `DATABASE_URL` is set and the table exists.
