# Brew Water Chem

A free, public brewing water chemistry calculator built for the brewing industry by
**Persyn Chemical Engineering and Consulting, PLLC** — a P.E.-licensed chemical
engineering consultancy.

The app calculates salt and acid additions required to convert a measured source water
profile into a target profile matched to BJCP 2021 style families. All calculations run
entirely in the browser; no data is sent to any server.

---

## Chemistry References

All formulas are cited inline in the source code. Key references:

| Citation | Used for |
|---|---|
| Palmer & Kaminski, *Water: A Comprehensive Guide for Brewers* (2013), Chapters 3–6 | Salt ion contributions, acid dose math, sulfate/chloride balance |
| Kolbach, P. (1953). "Über die Beziehung zwischen dem Vergärungsgrad…" *Monatsschrift für Brauerei* 6(2) | Residual alkalinity formula: RA = Alk − Ca/1.4 − Mg/1.7 |
| Troester, J. (2009). *Braukaiser.com* — "Water Chemistry", "Residual Alkalinity", "Mash pH" | Detailed derivations of Kolbach factors, acid capacity |
| BJCP Style Guidelines 2021 — https://www.bjcp.org/style/2021/ | Style family water target ranges |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot module reload.

### Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally:

```bash
npm run preview
```

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run all Vitest tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run lint` | ESLint over `src/` |

---

## Deploy to Netlify

### Option A — Netlify UI (drag & drop)

1. `npm run build`
2. Drag the `dist/` folder into [app.netlify.com/drop](https://app.netlify.com/drop)

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init          # link or create a Netlify site
netlify deploy --prod # deploy dist/ to production
```

### Option C — Git-connected site (recommended for ongoing work)

1. Push this repo to GitHub / GitLab / Bitbucket.
2. In the Netlify UI → **Add new site → Import an existing project**.
3. Build settings are pre-configured in `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 20
4. Every push to the default branch triggers an automatic deploy.

---

## Architecture Overview

```
brew-water-chem/
├── src/
│   ├── main.jsx                  Entry point — mounts <App /> into #root
│   ├── App.jsx                   Root state owner (tab, unit mode, source
│   │                             water, style selection, recipe overrides)
│   ├── chemistry/                Pure functions — zero React dependencies
│   │   ├── salts.js              Ion contribution constants (Palmer 2013 Ch.3)
│   │   ├── acids.js              Acid capacity and alkalinity reduction
│   │   ├── ra.js                 Residual alkalinity (Kolbach 1953)
│   │   ├── solver.js             Greedy ion-balancing solver
│   │   └── units.js              gal/bbl/oz/g/lb conversions
│   ├── data/
│   │   └── styles.js             BJCP 2021 style family profiles
│   ├── components/
│   │   ├── Header.jsx            Logo, brand label, Pro/Home toggle
│   │   ├── tabs/                 One component per tab
│   │   │   ├── WaterInTab.jsx    Source water ion inputs (Persyn report order)
│   │   │   ├── StyleTab.jsx      BJCP style family selector
│   │   │   ├── RecipeTab.jsx     Salt/acid additions + predicted final profile
│   │   │   └── NotesTab.jsx      Free-text brew session notes
│   │   └── shared/
│   │       ├── Card.jsx          White card container
│   │       ├── StatBox.jsx       Single-metric display tile
│   │       ├── InputRow.jsx      Labelled numeric input with hint text
│   │       └── styles.js         Design tokens (colours, radii, shadows)
│   └── styles/
│       └── globals.css           Document-level reset and base typography
└── tests/
    ├── setup.js                  @testing-library/jest-dom matchers
    ├── chemistry/                Unit tests for every pure function module
    │   ├── salts.test.js
    │   ├── acids.test.js
    │   ├── ra.test.js
    │   └── solver.test.js
    └── reference-batches/
        ├── batches.json          Lab-verified calibration batches (user-supplied)
        └── parity.test.js        Asserts solver within ±5% of each reference batch
```

### Unit modes

| | Pro | Home |
|---|---|---|
| Volume | bbl | gal |
| Salts | g | g |
| Liquid acid | mL | mL |
| Acidulated malt | lb | oz |

### Solver strategy

1. Compute the ion delta (target − source) for Ca, Mg, Na, SO₄, Cl.
2. Greedily add salts that close the largest positive deltas first, avoiding
   overshooting other ions.
3. Apply acid dose to reduce alkalinity to target (via `acidAlkalinityReduction`).
4. Re-sum source + all additions → predicted final ion profile.

The solver runs as a pure function (`solveAdditions`) with no side effects.
The RecipeTab pre-populates editable inputs with its output; users may override
any value and the predicted profile recomputes immediately.

### State management

All state lives in `App.jsx` React state for v1. No `localStorage` or
`sessionStorage` is used. Session persistence is deferred to v2.

---

## License

MIT © Persyn Chemical Engineering and Consulting, PLLC
