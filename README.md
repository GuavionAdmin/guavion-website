# Guavion Website

AI-orchestrated workflow platform landing page. Built with Vite, plain HTML/CSS/JS.

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

## Push to GitHub (if you need to restore elsewhere)

```bash
git remote set-url origin https://github.com/GuavionAdmin/GuavionWebsite.git
git add -A
git commit -m "Update site"
git push -u origin main
```

Then on another machine: `git clone https://github.com/GuavionAdmin/GuavionWebsite.git`
