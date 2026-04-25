"use client";

import { motion } from "framer-motion";
import type { SearchResult } from "@/src/api";

interface ResultsDropdownProps {
  results: SearchResult[];
  loading: boolean;
  hasActiveFilters: boolean;
  onSelect: (r: SearchResult) => void;
  compact?: boolean;
}

function verdictColor(verdict?: string) {
  if (verdict === "PROCEED") return "text-verdict-proceed";
  if (verdict === "PROCEED WITH CAUTION") return "text-verdict-caution";
  if (verdict === "AVOID") return "text-verdict-avoid";
  return "text-slate-500";
}

function verdictDot(verdict?: string) {
  if (verdict === "PROCEED")
    return "bg-verdict-proceed shadow-[0_0_6px_rgba(34,211,162,0.8)]";
  if (verdict === "PROCEED WITH CAUTION")
    return "bg-verdict-caution shadow-[0_0_6px_rgba(245,181,68,0.8)]";
  if (verdict === "AVOID")
    return "bg-verdict-avoid shadow-[0_0_6px_rgba(240,106,106,0.8)]";
  return "bg-slate-600";
}

export default function ResultsDropdown({
  results,
  loading,
  hasActiveFilters,
  onSelect,
  compact = false,
}: ResultsDropdownProps) {
  // Empty state: no filters set at all
  if (!loading && !hasActiveFilters && results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="glass-strong overflow-hidden rounded-2xl shadow-panel"
      >
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-slate-200">Start typing or pick a filter</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Browse by city, category, or years in business
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const showEmpty = !loading && hasActiveFilters && results.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={`glass-strong overflow-hidden rounded-2xl shadow-panel ${
        compact ? "max-h-72" : "max-h-[28rem]"
      } overflow-y-auto`}
    >
      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400" />
          <span className="mono tracking-wider">SEARCHING…</span>
        </div>
      )}

      {showEmpty && (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-slate-300">No businesses found.</p>
          <p className="mt-1 text-xs text-slate-500">
            Try a broader search or remove some filters.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="divide-y divide-white/5">
          {results.map((r, idx) => (
            <li key={r.fsq_place_id}>
              <button
                onClick={() => onSelect(r)}
                className="group/item flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-accent-500/5 focus:bg-accent-500/5 focus:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${verdictDot(
                        r.verdict
                      )}`}
                    />
                    <span className="truncate text-sm font-medium text-slate-100 group-hover/item:text-accent-100">
                      {r.name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-slate-400">
                    <span className="truncate">
                      {r.locality}
                      {r.region ? `, ${r.region}` : ""}
                    </span>
                    {r.level1 && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="truncate text-slate-500">
                          {r.level1}
                        </span>
                      </>
                    )}
                    {r.age_years !== undefined && r.age_years !== null && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="mono text-slate-500">
                          {Number(r.age_years).toFixed(1)}y
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {r.overall_score !== undefined && r.overall_score !== null && (
                    <span
                      className={`mono text-sm tabular-nums ${verdictColor(
                        r.verdict
                      )}`}
                    >
                      {Number(r.overall_score).toFixed(0)}
                    </span>
                  )}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-600 transition group-hover/item:translate-x-0.5 group-hover/item:text-accent-400"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}