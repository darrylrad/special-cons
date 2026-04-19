"use client";

import { useEffect, useRef, useState } from "react";
import { useCategories } from "@/src/hooks/useCategories";

export const YEAR_MAX = 50;

interface FilterChipsProps {
  city: string;
  onCityChange: (city: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  minYears: number;
  maxYears: number;
  onYearRangeChange: (min: number, max: number) => void;
}

// -----------------------------------------------------------------------------
// City chip — unchanged from before
// -----------------------------------------------------------------------------
function CityChip({
  city,
  onCityChange,
}: {
  city: string;
  onCityChange: (city: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing || city) {
    return (
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
    );
  }

  return (
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
  );
}

// -----------------------------------------------------------------------------
// Category chip — dropdown of level1 categories from /api/categories
// -----------------------------------------------------------------------------
function CategoryChip({
  category,
  onCategoryChange,
}: {
  category: string;
  onCategoryChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { data: categories, isLoading } = useCategories();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = category.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
          active
            ? "border-accent-500/30 bg-accent-500/10 text-accent-200"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-accent-500/30 hover:bg-accent-500/5 hover:text-accent-200"
        }`}
      >
        {active && (
          <span className="text-[10px] uppercase tracking-[0.14em] text-accent-400/80">
            Category
          </span>
        )}
        <span className={active ? "text-accent-100" : ""}>
          {active ? category : "Category"}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {active && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCategoryChange("");
            }}
            className="ml-0.5 text-accent-300/60 transition hover:text-accent-200"
            aria-label="Clear category filter"
          >
            ×
          </button>
        )}
      </button>

      {open && (
        <div className="glass-strong absolute left-0 top-full z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl shadow-panel">
          {isLoading && (
            <div className="px-4 py-3 text-xs text-slate-400">Loading…</div>
          )}
          {!isLoading && categories && categories.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-400">
              No categories available
            </div>
          )}
          {!isLoading && categories && (
            <ul className="divide-y divide-white/5">
              {categories.map((c) => (
                <li key={c}>
                  <button
                    onClick={() => {
                      onCategoryChange(c === category ? "" : c);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition hover:bg-accent-500/5 ${
                      c === category
                        ? "text-accent-200"
                        : "text-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition ${
                        c === category
                          ? "bg-accent-400 shadow-[0_0_6px_rgba(56,209,255,0.8)]"
                          : "bg-transparent"
                      }`}
                    />
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Year range chip — two-handle slider, 0 to YEAR_MAX (50+)
// -----------------------------------------------------------------------------
function YearRangeChip({
  minYears,
  maxYears,
  onYearRangeChange,
}: {
  minYears: number;
  maxYears: number;
  onYearRangeChange: (min: number, max: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = minYears > 0 || maxYears < YEAR_MAX;

  const formatRange = () => {
    if (!active) return "Any years";
    if (maxYears >= YEAR_MAX) return `${minYears}+ years`;
    if (minYears === 0) return `< ${maxYears} years`;
    return `${minYears} – ${maxYears} years`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
          active
            ? "border-accent-500/30 bg-accent-500/10 text-accent-200"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-accent-500/30 hover:bg-accent-500/5 hover:text-accent-200"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>{active ? formatRange() : "Years open"}</span>
        {active && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onYearRangeChange(0, YEAR_MAX);
            }}
            className="ml-0.5 text-accent-300/60 transition hover:text-accent-200"
            aria-label="Clear years filter"
          >
            ×
          </button>
        )}
      </button>

      {open && (
        <div className="glass-strong absolute left-0 top-full z-30 mt-2 w-72 rounded-xl p-5 shadow-panel">
          <div className="mono mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <span>Years in business</span>
            <span className="text-accent-300">{formatRange()}</span>
          </div>
          <DualRangeSlider
            min={0}
            max={YEAR_MAX}
            valueMin={minYears}
            valueMax={maxYears}
            onChange={onYearRangeChange}
          />
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>0</span>
            <span>{YEAR_MAX}+</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dual-handle range slider — two overlapping range inputs, custom styled.
// Left input controls min, right controls max. They can't cross.
// -----------------------------------------------------------------------------
function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  // Percent positions of the two handles, for the filled track between them.
  const minPct = ((valueMin - min) / (max - min)) * 100;
  const maxPct = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="relative h-6">
      {/* Base track */}
      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
      {/* Filled portion between handles */}
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent-400 shadow-[0_0_12px_rgba(56,209,255,0.5)]"
        style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
      />
      {/* Min handle — gets top z-index when dragging near the right edge */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valueMin}
        onChange={(e) => {
          const v = Number(e.target.value);
          // Don't let min cross max
          onChange(Math.min(v, valueMax - 1 < min ? min : valueMax - 1), valueMax);
        }}
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
        style={{ pointerEvents: "none" }}
      />
      {/* Max handle */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valueMax}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(valueMin, Math.max(v, valueMin + 1 > max ? max : valueMin + 1));
        }}
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
        style={{ pointerEvents: "none" }}
      />

      <style jsx>{`
        .range-thumb {
          height: 100%;
        }
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #38d1ff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 10px rgba(56, 209, 255, 0.7);
          cursor: grab;
          position: relative;
          z-index: 2;
        }
        .range-thumb::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #38d1ff;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 10px rgba(56, 209, 255, 0.7);
          cursor: grab;
        }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------------------------------
export default function FilterChips({
  city,
  onCityChange,
  category,
  onCategoryChange,
  minYears,
  maxYears,
  onYearRangeChange,
}: FilterChipsProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <CityChip city={city} onCityChange={onCityChange} />
      <CategoryChip
        category={category}
        onCategoryChange={onCategoryChange}
      />
      <YearRangeChip
        minYears={minYears}
        maxYears={maxYears}
        onYearRangeChange={onYearRangeChange}
      />
    </div>
  );
}