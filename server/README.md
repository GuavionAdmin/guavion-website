# Guavion waitlist API (Railway)

Minimal backend for the waitlist form. Uses Postgres on Railway.

## 1. Create the table in Postgres

In Railway → Postgres → Query (or any Postgres client connected to `DATABASE_URL`), run:

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

## 2. Deploy to Railway

**If this is a new service:**

1. In Railway, create a new project or use the one that has Postgres.
2. **New** → **GitHub repo** (or **Empty service** and push this `server/` folder).
3. Set **Root directory** to `server` (if the repo root is the whole site).
4. Add **Postgres** to the project and connect it to this service (Railway sets `DATABASE_URL`).
5. **Settings** → **Networking** → **Generate domain**. Copy the URL.

**If you already have a backend:** Copy the route from `index.js` (POST `/api/waitlist`) into your app instead of running this server.

## 3. Point the website at this API

When building the frontend, set:

```bash
VITE_API_URL=https://your-railway-app.up.railway.app
```

(Use the domain from step 2, no trailing slash.)

## Run locally (optional)

```bash
cd server
npm install
# Set DATABASE_URL to your Postgres connection string
npm start
```

API will be at http://localhost:3000 (POST /api/waitlist).
