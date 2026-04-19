"use client";

import { motion } from "framer-motion";

interface ScoreBarProps {
  label: string;
  value: number; // 0..100
  tooltip: string;
}

// Color the bar on the same green/amber/red scale as the verdict.
function colorFor(value: number) {
  if (value >= 65) return { bar: "bg-verdict-proceed", text: "text-verdict-proceed", glow: "shadow-[0_0_20px_rgba(34,211,162,0.35)]" };
  if (value >= 40) return { bar: "bg-verdict-caution", text: "text-verdict-caution", glow: "shadow-[0_0_20px_rgba(245,181,68,0.35)]" };
  return { bar: "bg-verdict-avoid", text: "text-verdict-avoid", glow: "shadow-[0_0_20px_rgba(240,106,106,0.35)]" };
}

export default function ScoreBar({ label, value, tooltip }: ScoreBarProps) {
  const c = colorFor(value);
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="group/bar">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
            {label}
          </span>
          {/* Inline tooltip — appears on hover of the info dot */}
          <div className="relative">
            <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-white/10 text-[9px] text-slate-500 transition hover:border-accent-400/50 hover:text-accent-300">
              ?
            </span>
            <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-white/10 bg-ink-900/95 px-3 py-2 text-[11px] leading-relaxed text-slate-200 opacity-0 shadow-panel backdrop-blur transition-opacity group-hover/bar:visible group-hover/bar:opacity-100">
              {tooltip}
            </span>
          </div>
        </div>
        <span className={`mono text-xs tabular-nums ${c.text}`}>
          {clamped.toFixed(1)}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full ${c.bar} ${c.glow}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
