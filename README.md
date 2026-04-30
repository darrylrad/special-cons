# Acqment — Phase 1 MVP

A pre-investment market risk screener. Search or browse a U.S. small business, see a risk verdict, signal breakdown, nearby competitors, and all of it anchored on an interactive 3D globe that zooms cinematically into a street-level map.

---

## Stack

- **Next.js 14 (App Router)** + TypeScript
- **Tailwind CSS** — custom `ink`, `accent`, `verdict` tokens in `tailwind.config.ts`
- **react-globe.gl** — dark 3D globe for the intro screen
- **Leaflet** + CARTO Dark Matter tiles — street-level map for the detail view
- **Framer Motion** — state-transition choreography
- **TanStack Query** — all data fetching & caching (client-side)
- **next/font** — Inter + JetBrains Mono, zero layout shift
- **Flask** + **pandas** — backend serving pre-computed risk scores from CSV

---

## Complete setup (first time)

Acqment has a frontend and a backend. You need both running.

### 1. Install Git LFS (required for the large data files)

The project ships large CSV/parquet files via Git LFS. Install it before cloning:

```bash
# macOS
brew install git-lfs

# Linux / Windows — see https://git-lfs.com
```

Then in the repo:

```bash
git lfs install
git lfs pull
```

### 2. Install frontend dependencies

From the project root:

```bash
pnpm install        # or npm install / yarn
cp .env.local.example .env.local
```

### 3. Set up the backend (Python)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # on Windows: .venv\Scripts\activate
python3 -m pip install --upgrade pip
pip install flask flask-cors pandas pyarrow
```

### 4. Generate the scored dataset (one time only)

The backend serves pre-computed risk scores. Generate them by running the scoring pipeline:

```bash
# still inside /backend with venv activated
python3 scoring.py
```

This reads the parquet source files and produces `scored_businesses.csv` (~400k rows).
You only need to do this once per dataset refresh.

### 5. Start the backend API

```bash
# still inside /backend with venv activated
python3 app.py
```

The API listens on `http://localhost:5001`.

> **macOS note**: port 5000 is used by AirPlay Receiver, which is why this project uses 5001. If you're on Linux/Windows and port 5000 is free, you can change the port in the last line of `backend/app.py`.

### 6. Confirm `.env.local` points at the real backend

Your `.env.local` should look like:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_USE_MOCK_API=false
```

### 7. Start the frontend

In a **new terminal** (leave the Flask one running), from the project root:

```bash
pnpm dev            # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the globe and a search bar.

---

## Day-to-day (after first-time setup)

Two terminals, both simple:

```bash
# Terminal 1 — backend
cd backend
source .venv/bin/activate
python3 app.py

# Terminal 2 — frontend
pnpm dev
```

---

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5001` | Backend origin |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | Flip to `true` to use in-memory mocks (dev only) |
| `NEXT_PUBLIC_DEBUG_API` | `false` | Log every API call to the browser console |

All three are `NEXT_PUBLIC_`-prefixed because API calls happen client-side.

---

## Backend API

All endpoints live under `http://localhost:5001`. CORS is open for local dev.

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/search?q=&city=&category=&min_years=&max_years=` | Search with any combination of filters. Returns up to 25 results, sorted by overall score. |
| GET | `/api/categories` | List of all distinct level-1 categories (for the Category filter dropdown) |
| GET | `/api/report/{fsq_place_id}` | Full risk report for one business |
| GET | `/api/competitors/{fsq_place_id}` | Nearby competitors (same zip + category), with their own scores for the map popup |

**Verdict thresholds**: 65+ = PROCEED, 40–65 = CAUTION, < 40 = AVOID.

**Errors**: uniform `{ "error": "..." }` with HTTP error status. Surfaced in the UI via a toast.

Full TypeScript types: `src/api/types.ts`.

---

## Features

### Discovery / search
- Free-text search matches **business name, locality, or category**
- City filter (typed)
- Category filter (dropdown populated from `/api/categories`)
- Years-in-business range filter (two-handle slider, 0–50+)
- Any combination works; all four can be active at once
- Results sort by overall risk score, highest first
- "Start typing or pick a filter" empty state

### Detail view
- Verdict badge (PROCEED / CAUTION / AVOID) with color coding
- Signal breakdown (5 score bars, each 0–100)
- By-the-numbers stat grid (competitors, closure rate, avg age, ecosystem diversity)
- Scrollable list of nearby competitors with their own scores

### Cinematic transition
- Click a search result → globe zooms to NYC region → continues to the business's coordinates → fades into a Leaflet street-level map centered on the business → detail panel slides in from the right

### Map popups
- Click a competitor pin on the map → popup with name, verdict, overall score, and full signal breakdown
- Click a competitor row in the detail panel → map flies to that pin, pulses it, and opens the same popup

---

## Mock mode (optional)

For frontend work without running the backend, the mock and real clients expose an identical `AcqmentApi` interface (`src/api/types.ts`).

```env
# .env.local
NEXT_PUBLIC_USE_MOCK_API=true
```

The mock ships three seeded businesses covering all three verdict tiers, plus a synthetic fallback:

| Query | Verdict |
| --- | --- |
| `joe` / `laundromat` | **PROCEED WITH CAUTION** (Brooklyn) |
| `coffee` / `riverside` | **PROCEED** (Austin) |
| `nail` / `glimmer` | **AVOID** (Miami) |
| `notfound` | empty (tests empty state) |
| `error` | throws (tests toast) |

Each mock call adds 300–600 ms of latency so loading skeletons stay exercised.

---

## Project layout

```
/app
  layout.tsx         — fonts, root shell
  providers.tsx      — QueryClient + toast context
  page.tsx           — State A ↔ State B orchestration
  globals.css        — Tailwind + utilities (.glass, .bg-grid, etc.)
/components
  Globe.tsx          — react-globe.gl wrapper for intro screen
  CityMap.tsx        — Leaflet street map + popup for detail view
  SearchPill.tsx
  FilterChips.tsx    — City + Category + Years range slider
  ResultsDropdown.tsx
  DetailPanel.tsx    — header, location, scores, stats, competitors
  ScoreBar.tsx
  VerdictBadge.tsx
  CompetitorList.tsx
/src
  /api
    types.ts         — contract types
    client.ts        — real fetch client with NaN-safe normalizers
    mockApi.ts       — simulated latency + error paths
    index.ts         — env-flag swap between mock and real
  /hooks
    useSearch.ts     — 250 ms debounce + filter-aware enabled gate
    useCategories.ts — loads /api/categories once per session
    useReport.ts
    useCompetitors.ts
/backend
  app.py             — Flask API
  scoring.py         — one-time data pipeline
  scored_businesses.csv  — generated by scoring.py
```

---

## Design direction

Mission-control dark UI — near-black `#0a0a0f` canvas, electric cyan accents, generous whitespace in the detail panel, mono type for coordinates and section indices. All color coding (verdict badge, score bars, overall number, pin glow, map popup) derives from the same green/amber/red scale so the verdict reads consistently across the UI.

---

## Troubleshooting

**CORS errors** → `flask-cors` isn't installed in your active Python environment. Inside the backend folder, activate your venv and run `pip install flask-cors`. Check with `pip show flask-cors`.

**`HTTP 403 Server: AirTunes` from curl on macOS** → AirPlay Receiver is squatting on port 5000. The backend uses 5001 to dodge this. If you still hit it, confirm `app.py` ends with `app.run(debug=True, port=5001)`.

**`externally-managed-environment` pip error on macOS** → Homebrew Python refuses system-wide installs. Use a venv: `python3 -m venv .venv && source .venv/bin/activate` before `pip install`.

**Frontend loads but search returns empty dropdowns** → Turn on `NEXT_PUBLIC_DEBUG_API=true` and check the browser console. If the response has `NaN` values, the backend is emitting invalid JSON — `app.py` should clean these via `_clean_nan()`. If the response is fine but the dropdown is empty, check that your `.env.local` has `NEXT_PUBLIC_USE_MOCK_API=false` and that Flask is actually running.

**Globe doesn't fly to NYC** → In `page.tsx`, `handleSelect` must set `isTransitioning=true` *before* `setSelectedId`, and the globe/map AnimatePresence condition must be `detailMode && !isTransitioning`. If the globe unmounts before the zoom runs, the ref becomes null and nothing happens.

**Three-globe `isBehindGlobe` errors** → We pass `pins={[]}` to the Globe component so no pins render during the zoom. The errors originate in the library and aren't our bug; keeping the globe pinless sidesteps them entirely. Pins show up on the Leaflet map, which is where they add value anyway.

**Leaflet markers offset or tiles missing** → Make sure `leaflet/dist/leaflet.css` is imported at the top of `app/globals.css`:
```css
@import "leaflet/dist/leaflet.css";
```

---

---

## Acknowledgments

This project was built in a pair-programming flow with [Claude](https://claude.ai) by Anthropic. Claude scaffolded the initial frontend architecture, wrote the API client and normalization layer, designed the mission-control UI system, and helped debug through a few memorable rabbit holes (AirPlay squatting on port 5000, pandas NaN in JSON output, the three-globe `isBehindGlobe` crash, and a ref-timing bug that ate an hour before we found it). All the product direction, data pipeline, scoring methodology, and "this feels right / this doesn't" judgment was human-driven.

Built with Claude Opus 4.7.

## Out of scope (Phase 1)

- Accounts, saved searches, PDF export
- Datasets outside NYC (backend currently loads NYC businesses only)
- Server Components for data fetching — everything stays client-side via TanStack Query
- Heatmaps / aggregate market views (future)