# Acquira — Phase 1 (Frontend MVP)

A pre-investment market risk screener. Search a U.S. small business, see a risk verdict, signal breakdown, nearby competitors, and all of it anchored on an interactive 3D globe.

This repo is the **frontend only**. The backend is being built separately against the contract documented below.

---

## Stack

- **Next.js 14 (App Router)** + TypeScript
- **Tailwind CSS** (custom `ink`, `accent`, `verdict` tokens in `tailwind.config.ts`)
- **react-globe.gl** — dark 3D globe for the intro screen
- **Leaflet** + CARTO Dark Matter tiles — street-level map for business detail view
- **Framer Motion** — state-transition choreography
- **TanStack Query** — all data fetching & caching (client-side)
- **next/font** — Inter + JetBrains Mono, zero layout shift

---

## Setup

```bash
pnpm install        # or npm / yarn
cp .env.local.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

# Backend Setup

## Install Dependencies Run Once(Creating scored_businesses.csv)

```bash
cd backend
pip3 install flask flask-cors pandas pyarrow
```
for MacOS users:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install flask flask-cors pandas pyarrow
```

## Start API
```bash
cd backend
python3 app.py
```
API runs at `http://localhost:5001`
> Note: On macOS, port 5000 is used by AirPlay Receiver, which is why this project uses port 5001. If you're on another OS and port 5000 is free, you can change the port in `backend/app.py` (last line).

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/search?q=pizza&city=Brooklyn` | Search businesses by name |
| GET | `/api/report/{place_id}` | Get full risk report |
| GET | `/api/competitors/{place_id}` | Get nearby competitors |

## How scores were generated (for reference)
See `scoring.py` — reads from parquet files and produces `scored_businesses.csv`.

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5001` | Backend origin |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | Flip to `true` to use mocks (dev only) |
| `NEXT_PUBLIC_DEBUG_API` | `false` | Log every API call to console (dev only) |

Both are `NEXT_PUBLIC_`-prefixed because all calls are client-side.

This project uses Git LFS for large data files (for example .csv and .parquet).
Before cloning or pulling large files, make sure Git LFS is installed and initialized:

```bash
git lfs install
git lfs pull
```

For MacOS, you can install with:
```bash
brew install git-lfs
```

---

## Mock → real swap

The mock and real clients expose an **identical** `AcquiraApi` interface (see `src/api/types.ts`). To switch:

```env
# .env.local
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
```

Restart `pnpm dev`. **No UI code changes.** The swap happens in `src/api/index.ts`.

### Mock data coverage

`src/api/mockApi.ts` ships three seeded businesses that cover all three verdict tiers, plus a synthetic fallback so any search always returns something during dev:

| Query | Verdict |
| --- | --- |
| `joe` / `laundromat` | **PROCEED WITH CAUTION** (Brooklyn) |
| `coffee` / `riverside` | **PROCEED** (Austin) |
| `nail` / `glimmer` | **AVOID** (Miami) |
| `notfound` | empty results — tests the empty state |
| `error` | throws — tests toast error handling |

Each mock call has a 300–600 ms jitter so loading skeletons are actually exercised.

---

## Backend API contract

### `GET /api/search?q={name}&city={optional}`
Returns up to 10 `SearchResult[]`.

### `GET /api/report/{fsq_place_id}`
Returns a `Report` — business, verdict, 0–100 scores, details.
Verdict thresholds: **65+ = PROCEED**, **40–65 = CAUTION**, **< 40 = AVOID**.

### `GET /api/competitors/{fsq_place_id}`
Returns up to 20 `Competitor[]` with `latitude`, `longitude`, `date_created`.

### Errors
Uniform `{ "error": "..." }` with HTTP error status. Handled globally via toast.

Full types: `src/api/types.ts`.

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
  CityMap.tsx        — Leaflet street-level map for detail view
  SearchPill.tsx
  FilterChips.tsx
  ResultsDropdown.tsx
  DetailPanel.tsx
  ScoreBar.tsx
  VerdictBadge.tsx
  CompetitorList.tsx
/src
  /api
    types.ts         — contract types
    client.ts        — real fetch client
    mockApi.ts       — simulated latency + error paths
    index.ts         — env-flag swap
  /hooks
    useSearch.ts     — 250 ms debounce via useDebouncedValue
    useReport.ts
    useCompetitors.ts
```

---

## Design direction

Mission-control dark UI — near-black `#0a0a0f` canvas, electric cyan accents, generous whitespace in the detail panel, mono type for coordinates and section indices. All color-coding (verdict, score bars, overall number, pin glow) derives from the same green/amber/red scale so the verdict reads consistently from the badge down through the bars.

**The State A → State B transition** is a two-stage cinematic:

1. User clicks a search result
2. The 3D globe zooms from its default view to the NYC region (~1s)
3. The globe continues zooming into the business's specific coordinates (~900ms)
4. The globe fades out and a dark street-level Leaflet map fades in, centered on the business
5. The detail panel slides in from the right with scores, stats, and competitor list

The globe (react-globe.gl) is used only for the intro/zoom sequence because it renders a single flat earth image that pixelates at street level. The map (Leaflet) takes over once we're zoomed in, showing real streets, parks, and neighborhoods at the business's actual location — making competitor pins read as meaningful spatial relationships rather than abstract dots.

On mobile (<768 px) the detail panel takes over the screen and the map hides behind it.

---



## Troubleshooting

**CORS errors** → Make sure `flask-cors` is installed in your Python environment. Check with `pip show flask-cors`.

**`HTTP 403 Server: AirTunes` from curl** → You're on macOS and AirPlay Receiver is using port 5000. The backend runs on 5001 to avoid this. If you still hit it, either disable AirPlay Receiver in System Settings or double-check the port in `app.py`.

**`externally-managed-environment` pip error** → Use a virtualenv: `python3 -m venv .venv && source .venv/bin/activate` before running `pip install`.

**Frontend loads but search returns empty dropdowns** → Check the browser console with `NEXT_PUBLIC_DEBUG_API=true`. If the response contains `NaN`, the backend is emitting invalid JSON — this is handled in the current `app.py` but older versions need the NaN-cleanup fix.

**Globe doesn't fly to NYC** → Check that `handleSelect` in `page.tsx` sets `isTransitioning=true` before setting `selectedId`, and that the `AnimatePresence` condition is `detailMode && !isTransitioning`. If either is wrong, the globe unmounts before the zoom can run.


---
## Out of scope (Phase 1)

- The backend (teammate owns it)
- Filters beyond `city`
- Accounts, saved searches, PDF export
- Server Components for data fetching — everything stays client-side via TanStack Query
