# Graph Report - guavion-website  (2026-09-24)

## Corpus Check
- 12 files · ~39,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 82 nodes · 90 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bdf41eaa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.js
- package.json
- Waitlist: Full setup guide
- package.json
- Guavion Website
- three-bg.js
- Guavion waitlist API (Railway)
- index.js
- push.sh
- package.json

## God Nodes (most connected - your core abstractions)
1. `initHeroScene()` - 8 edges
2. `initGateScene()` - 8 edges
3. `Guavion Website` - 7 edges
4. `Waitlist: Full setup guide` - 7 edges
5. `Guavion waitlist API (Railway)` - 5 edges
6. `scripts` - 4 edges
7. `unlockSite()` - 4 edges
8. `initCtaScene()` - 4 edges
9. `isMobile()` - 3 edges
10. `makeRenderer()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `unlockSite()` --calls--> `initHeroScene()`  [EXTRACTED]
  src/main.js → src/three-bg.js
- `unlockSite()` --calls--> `initCtaScene()`  [EXTRACTED]
  src/main.js → src/three-bg.js

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.15
Nodes (14): form, gate, gateBtn, gateError, gateInput, header, msg, nav (+6 more)

### Community 1 - "package.json"
Cohesion: 0.15
Nodes (12): dependencies, three, devDependencies, vite, name, private, scripts, build (+4 more)

### Community 2 - "Waitlist: Full setup guide"
Cohesion: 0.17
Nodes (11): 1. Postgres: create the table, 2. Backend on Railway: add the endpoint, 3. Railway: get your backend URL, 4. Frontend: point the site at your backend, 5. Quick checklist, Build locally, Build on Vercel / Netlify / etc., Option A: You already have a Node/Express backend (+3 more)

### Community 3 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, cors, express, pg, name, private, scripts, start (+2 more)

### Community 4 - "Guavion Website"
Cohesion: 0.25
Nodes (7): Build for production, Guavion Website, Project structure, Push to GitHub (if you need to restore elsewhere), Run locally, Waitlist → Railway backend, Where is the code?

### Community 5 - "three-bg.js"
Cohesion: 0.61
Nodes (7): initGateScene(), initHeroScene(), isMobile(), makeDust(), makeRenderer(), onResize(), runLoop()

### Community 6 - "Guavion waitlist API (Railway)"
Cohesion: 0.33
Nodes (5): 1. Create the table in Postgres, 2. Deploy to Railway, 3. Point the website at this API, Guavion waitlist API (Railway), Run locally (optional)

### Community 7 - "index.js"
Cohesion: 0.67
Nodes (3): app, initDB(), pool

## Knowledge Gaps
- **49 isolated node(s):** `type`, `name`, `private`, `version`, `type` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initHeroScene()` connect `three-bg.js` to `main.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `type`, `name`, `private` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._