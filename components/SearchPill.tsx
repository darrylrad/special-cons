"use client";

import { forwardRef } from "react";

interface SearchPillProps {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  compact?: boolean;
  placeholder?: string;
}

const SearchPill = forwardRef<HTMLInputElement, SearchPillProps>(
  function SearchPill(
    {
      value,
      onChange,
      onFocus,
      onBlur,
      compact = false,
      placeholder = "Search a business name…",
    },
    ref
  ) {
    return (
      <div
        className={`glass group/pill relative flex items-center rounded-full transition-all duration-500 ${
          compact ? "px-4 py-2.5" : "px-6 py-4"
        } shadow-glow`}
      >
        <div
          className={`flex shrink-0 items-center justify-center text-accent-400 transition ${
            compact ? "h-4 w-4" : "h-5 w-5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`ml-3 flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none ${
            compact ? "text-sm" : "text-base"
          }`}
        />

        {value && (
          <button
            onClick={() => onChange("")}
            className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {!compact && (
          <div className="mono ml-3 hidden shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500 md:block">
            ⌘K
          </div>
        )}
      </div>
    );
  }
);

export default SearchPill;
