"use client";

import { motion } from "framer-motion";
import type { SearchResult } from "@/src/api";

interface ResultsDropdownProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onSelect: (r: SearchResult) => void;
  compact?: boolean;
}

export default function ResultsDropdown({
  results,
  loading,
  query,
  onSelect,
  compact = false,
}: ResultsDropdownProps) {
  const showEmpty = !loading && query.trim().length > 0 && results.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={`glass-strong overflow-hidden rounded-2xl shadow-panel ${
        compact ? "max-h-72" : "max-h-96"
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
            Try a broader search or remove filters.
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
                  <div className="truncate text-sm font-medium text-slate-100 group-hover/item:text-accent-100">
                    {r.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {r.address} · {r.locality}, {r.region}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px] uppercase tracking-widest text-slate-600 group-hover/item:text-accent-400">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
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
