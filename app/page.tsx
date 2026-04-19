"use client";

import { forwardRef, useEffect, useMemo, useRef, useState, type ComponentProps} from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import SearchPill from "@/components/SearchPill";
import FilterChips from "@/components/FilterChips";
import ResultsDropdown from "@/components/ResultsDropdown";
import DetailPanel from "@/components/DetailPanel";
import type { GlobeHandle, GlobePin } from "@/components/Globe";
import { useSearch } from "@/src/hooks/useSearch";
import { useReport } from "@/src/hooks/useReport";
import { useCompetitors } from "@/src/hooks/useCompetitors";
import { useToast } from "./providers";
import type { SearchResult } from "@/src/api";

declare global {
  interface Window {
    __gapmapGlobe?: import("@/components/Globe").GlobeHandle;
  }
}

const DynamicGlobe = dynamic(() => import("@/components/Globe"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

const DynamicCityMap = dynamic(() => import("@/components/CityMap"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

const Globe = forwardRef<GlobeHandle, Omit<ComponentProps<typeof DynamicGlobe>, "forwardedRef">>(
  function Globe(props, ref) {
    return <DynamicGlobe {...props} forwardedRef={ref} />;
  }
);

const CityMap = forwardRef<GlobeHandle, Omit<ComponentProps<typeof DynamicCityMap>, "forwardedRef">>(
  function CityMap(props, ref) {
    return <DynamicCityMap {...props} forwardedRef={ref} />;
  }
);

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 animate-pulse rounded-full border border-accent-500/30 bg-accent-500/5" />
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
          Calibrating globe…
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const [pulsingCompetitorIdx, setPulsingCompetitorIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const globeRef = useRef<GlobeHandle | null>(null);
  const { push: pushToast } = useToast();

  const search = useSearch(query, city);
  const report = useReport(selectedId);
  const competitors = useCompetitors(selectedId);

  const detailMode = selectedId !== null;

  // Surface errors as toasts.
  useEffect(() => {
    if (search.error) pushToast((search.error as Error).message || "Search failed");
  }, [search.error, pushToast]);
  useEffect(() => {
    if (report.error) pushToast((report.error as Error).message || "Report unavailable");
  }, [report.error, pushToast]);
  useEffect(() => {
    if (competitors.error)
      pushToast((competitors.error as Error).message || "Competitors unavailable");
  }, [competitors.error, pushToast]);



  // Build the full set of pins shown on the globe.
  const pins: GlobePin[] = useMemo(() => {
    const out: GlobePin[] = [];
    if (report.data) {
      out.push({
        id: "target",
        lat: report.data.business.latitude,
        lng: report.data.business.longitude,
        kind: "target",
        label: report.data.business.name,
      });
    }
    if (competitors.data) {
      competitors.data.forEach((c, i) => {
        out.push({
          id: `competitor-${i}`,
          lat: c.latitude,
          lng: c.longitude,
          kind: "competitor",
          pulseAt: pulsingCompetitorIdx === i ? pulseTick : undefined,
        });
      });
    }
    return out;
  }, [report.data, competitors.data, pulsingCompetitorIdx, pulseTick]);

  const handleSelect = async (r: SearchResult) => {
    setFocused(false);
  
    // Set transitioning FIRST. This keeps the globe mounted even when
    // detailMode flips to true on the next line.
    console.log("[select] pins before transition:", pins); //debug
    setIsTransitioning(true);
    setSelectedId(r.fsq_place_id);
  
    // Give React a tick to process the state updates before we touch the ref.
    await new Promise((r) => setTimeout(r, 50));
  
    try {
      const report = await (await import("@/src/api")).api.getReport(r.fsq_place_id);
  
      console.log("[select] globeRef.current is:", globeRef.current);
  
      if (typeof window !== "undefined" && window.__gapmapGlobe?.zoomToLocation) {
        console.log("[select] starting zoom via window");
        await window.__gapmapGlobe.zoomToLocation(
          report.business.latitude,
          report.business.longitude
        );
        console.log("[select] zoom finished");
        //await new Promise((r) => setTimeout(r, 400)); // slight delay after zoom before showing panel
      }
    } catch (e) {
      console.error("[select] error", e);
    }
  
    setIsTransitioning(false);
  };

  const handleBack = () => {
    setSelectedId(null);
    setQuery("");
    setPulsingCompetitorIdx(null);
    globeRef.current?.resetView();
  };

  const handlePulseCompetitor = (index: number) => {
    setPulsingCompetitorIdx(index);
    setPulseTick(Date.now());
    // Also fly to that competitor for quick reference.
    const c = competitors.data?.[index];
    if (c) globeRef.current?.flyTo(c.latitude, c.longitude, 0.4);
    setTimeout(() => setPulsingCompetitorIdx(null), 1600);
  };

  const showDropdown =
    focused &&
    query.trim().length > 0 &&
    !detailMode;

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-ink-950">
      {/* Atmospheric background grid — sits under everything */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(0,183,255,0.08), transparent 60%)",
        }}
      />

      {/* Masthead — always visible, top-left */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-8 py-6">
        <button
          onClick={handleBack}
          className="pointer-events-auto group flex items-center gap-2.5"
          aria-label="Back to home"
        >
          <div className="relative h-7 w-7">
            <div className="absolute inset-0 rounded-lg border border-accent-400/40 bg-accent-500/10" />
            <div className="absolute inset-1.5 rounded-sm bg-accent-400 shadow-[0_0_12px_rgba(56,209,255,0.8)]" />
            <div className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-ink-950" />
            <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-ink-950" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-100 transition group-hover:text-accent-200">
              GapMap
            </div>
            <div className="mono -mt-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-500">
              Market risk screener
            </div>
          </div>
        </button>

        <div className="mono pointer-events-auto hidden items-center gap-2 rounded-full border border-white/5 bg-ink-900/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-verdict-proceed shadow-[0_0_8px_rgba(34,211,162,0.8)]" />
          Phase 1 · MVP
        </div>
      </header>

      {/* Globe — animates its width container when switching to detail mode */}
      <motion.div
        layout
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        className={`relative h-full ${detailMode ? "hidden md:block md:w-[45%]" : "w-full"}`}
      >

          <AnimatePresence mode="sync">
            {detailMode && !isTransitioning ? (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="h-full w-full absolute inset-0"
              >
                <CityMap
                  ref={globeRef}
                  pins={pins}
                  center={
                    report.data
                      ? {
                          lat: report.data.business.latitude,
                          lng: report.data.business.longitude,
                          zoom: 15,
                        }
                      : undefined
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="globe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="h-full w-full absolute inset-0"
              >
                <Globe
                  ref={globeRef}
                  pins={[]}
                  autoRotate={!detailMode && !isTransitioning}
                  compact={detailMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        

        {/* State A — Search overlay */}
        <AnimatePresence>
          {!detailMode && (
            <motion.div
              key="state-a"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-10 flex items-start justify-center px-6 pt-[28vh]"
            >
              <div className="w-full max-w-xl">
                {/* Kicker */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mb-8 text-center"
                >
                  <div className="mono mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <span className="h-1 w-1 rounded-full bg-accent-400" />
                    Pre-investment intel
                  </div>
                  <h1 className="text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-[1.15] tracking-tight text-slate-50">
                    Know what you're buying
                    <br />
                    <span className="text-slate-400">before you buy it.</span>
                  </h1>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <SearchPill
                    value={query}
                    onChange={setQuery}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                  />
                  <FilterChips city={city} onCityChange={setCity} />
                </motion.div>

                <div className="relative mt-3">
                  <AnimatePresence>
                    {showDropdown && (
                      <ResultsDropdown
                        results={search.data || []}
                        loading={search.isFetching}
                        query={query}
                        onSelect={handleSelect}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact search pill at top in detail mode */}
        <AnimatePresence>
          {detailMode && (
            <motion.div
              key="state-b-search"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute left-1/2 top-6 z-20 w-[calc(100%-12rem)] max-w-md -translate-x-1/2"
            >
              <SearchPill
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  if (v.length > 0) setFocused(true);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                compact
                placeholder="Search another business…"
              />
              <AnimatePresence>
                {focused && query.trim().length > 0 && (
                  <div className="mt-2">
                    <ResultsDropdown
                      results={search.data || []}
                      loading={search.isFetching}
                      query={query}
                      onSelect={handleSelect}
                      compact
                    />
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detail panel — mounts when a result is selected. On mobile it goes full-screen. */}
      <AnimatePresence>
        {detailMode && (
          <motion.div
            key="state-b-panel"
            layout
            className="fixed inset-0 z-20 md:static md:z-auto md:block md:h-full md:w-[55%]"
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <DetailPanel
              report={report.data}
              competitors={competitors.data}
              isLoading={report.isLoading}
              onPulseCompetitor={handlePulseCompetitor}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
