# Guavion Website

An application-agnostic AI-orchestrated workflow platform landing page. Built with Vite, plain HTML/CSS/JS.

## Where is the code?

- **This folder** — Open `Guavion Website` in Cursor or VS Code. All source files are here.
- **GitHub** — After pushing, clone from:  
  `git clone https://github.com/GuavionAdmin/GuavionWebsite.git`

## Project structure

```
Guavion Website/
├── index.html      # Main HTML
├── package.json    # Dependencies (Vite)
├── vite.config.js # Vite config
├── src/
│   ├── main.js     # Entry + nav + waitlist form
│   └── style.css   # All styles
└── README.md       # This file
```

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
```

Output is in `dist/`.

## Waitlist → Railway backend

The waitlist form POSTs to your backend when `VITE_API_URL` is set.

1. **Set the API URL** when building (e.g. your Railway backend):
   ```bash
   VITE_API_URL=https://your-app.up.railway.app npm run build
   ```
   Or in your host’s env (Vercel, Netlify, etc.) set `VITE_API_URL` to your Railway backend URL.

2. **Backend contract:** Your Railway backend should expose:
   - **POST** `/api/waitlist`
   - **Body (JSON):** `{ name, email, company?, role?, interest?, message? }`
   - **Response:** 2xx on success (e.g. 200 or 201). Store the payload in Postgres and return any JSON.

If `VITE_API_URL` is not set, the form still works but only shows “Thanks!” and does not send data anywhere.

## Push to GitHub (if you need to restore elsewhere)

```bash
git remote set-url origin https://github.com/GuavionAdmin/GuavionWebsite.git
git add -A
git commit -m "Update site"
git push -u origin main
```

Then on another machine: `git clone https://github.com/GuavionAdmin/GuavionWebsite.git`
