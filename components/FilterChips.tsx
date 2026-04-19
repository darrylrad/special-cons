"use client";

import { useState } from "react";

interface FilterChipsProps {
  city: string;
  onCityChange: (city: string) => void;
}

function DisabledChip({ label }: { label: string }) {
  return (
    <div className="group relative">
      <button
        disabled
        className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-500"
      >
        {label}
        <span className="mono text-[9px] uppercase tracking-widest text-slate-600">
          soon
        </span>
      </button>
      <span className="pointer-events-none invisible absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink-900/95 px-2.5 py-1.5 text-[11px] text-slate-300 opacity-0 shadow-panel backdrop-blur transition-opacity group-hover:visible group-hover:opacity-100">
        Coming soon
      </span>
    </div>
  );
}

export default function FilterChips({ city, onCityChange }: FilterChipsProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      {/* City filter — wired to backend */}
      {editing || city ? (
        <div className="flex items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs text-accent-200">
          <span className="text-[10px] uppercase tracking-[0.14em] text-accent-400/80">
            City
          </span>
          <input
            autoFocus={editing}
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            onBlur={() => setEditing(false)}
            placeholder="Brooklyn"
            className="w-24 bg-transparent text-accent-100 placeholder:text-accent-300/40 focus:outline-none"
          />
          {city && (
            <button
              onClick={() => {
                onCityChange("");
                setEditing(false);
              }}
              className="ml-0.5 text-accent-300/60 transition hover:text-accent-200"
              aria-label="Clear city filter"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent-500/30 hover:bg-accent-500/5 hover:text-accent-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-7-8-13a8 8 0 0 1 16 0c0 6-8 13-8 13z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          City
        </button>
      )}

      <DisabledChip label="Category" />
      <DisabledChip label="Region" />
      <DisabledChip label="Include closed" />
    </div>
  );
}
