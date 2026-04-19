# GapMap — Phase 1 (Frontend MVP)

A pre-investment market risk screener. Search a U.S. small business, see a risk verdict, signal breakdown, nearby competitors, and all of it anchored on an interactive 3D globe.

This repo is the **frontend only**. The backend is being built separately against the contract documented below.

---

## Stack

- **Next.js 14 (App Router)** + TypeScript
- **Tailwind CSS** (custom `ink`, `accent`, `verdict` tokens in `tailwind.config.ts`)
- **react-globe.gl** — loaded via `next/dynamic` with `ssr: false`
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

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Real backend origin |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` | Flip to `false` to use the real backend |

Both are `NEXT_PUBLIC_`-prefixed because all calls are client-side.

---

## Mock → real swap

The mock and real clients expose an **identical** `GapMapApi` interface (see `src/api/types.ts`). To switch:

```env
# .env.local
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
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
  Globe.tsx          — react-globe.gl wrapper, ref exposes flyTo / resetView
  SearchPill.tsx     — glass pill input
  FilterChips.tsx    — City (live) + Category/Region/Closed (disabled, tooltip)
  ResultsDropdown.tsx
  DetailPanel.tsx    — header, location, scores, stats, competitors
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

The State A → State B transition: the globe collapses to 45% width while the detail panel slides in from the right over 600 ms (`cubic-bezier(0.4, 0, 0.2, 1)`), the target pin lands and pulses, the camera flies to its coordinates over 1500 ms. On mobile (<768 px) the detail panel takes over the screen and the globe hides.

---

## Out of scope (Phase 1)

- The backend (teammate owns it)
- Filters beyond `city`
- Accounts, saved searches, PDF export
- Server Components for data fetching — everything stays client-side via TanStack Query
