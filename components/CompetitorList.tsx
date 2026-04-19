"use client";

import type { Competitor } from "@/src/api";

interface CompetitorListProps {
  competitors: Competitor[];
  onPulse: (index: number) => void;
}

function formatOpened(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function ageYears(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  const years = ms / (1000 * 60 * 60 * 24 * 365.25);
  return years;
}

export default function CompetitorList({ competitors, onPulse }: CompetitorListProps) {
  if (competitors.length === 0) {
    return (
      <p className="text-sm text-slate-500">No nearby competitors found.</p>
    );
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
      {competitors.map((c, i) => {
        const years = ageYears(c.date_created);
        return (
          <li key={`${c.name}-${i}`}>
            <button
              onClick={() => onPulse(i)}
              className="group/comp flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent-500/5 focus:bg-accent-500/5 focus:outline-none"
            >
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                <span className="mono text-[10px] text-slate-500 group-hover/comp:text-accent-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100 group-hover/comp:text-accent-100">
                  {c.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {c.address}
                </div>
                <div className="mono mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
                  <span>Opened: {formatOpened(c.date_created)}</span>
                  {years !== null && (
                    <>
                      <span className="text-slate-700">•</span>
                      <span>{years.toFixed(1)}y old</span>
                    </>
                  )}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-2 shrink-0 text-slate-600 transition group-hover/comp:text-accent-400"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
