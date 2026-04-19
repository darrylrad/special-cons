"use client";

import { motion } from "framer-motion";
import type { Competitor, Report } from "@/src/api";
import VerdictBadge from "./VerdictBadge";
import ScoreBar from "./ScoreBar";
import CompetitorList from "./CompetitorList";

interface DetailPanelProps {
  report: Report | undefined;
  competitors: Competitor[] | undefined;
  isLoading: boolean;
  onPulseCompetitor: (index: number) => void;
  onBack: () => void;
}

const SCORE_TOOLTIPS: Record<string, string> = {
  Saturation: "How crowded the market is nearby. Higher = less saturated, more room.",
  Churn: "Rate businesses in this category open and close. Higher = more stable turnover.",
  Stability: "How long businesses in this category tend to last. Higher = more durable.",
  Diversity: "Variety of surrounding business categories. Higher = healthier ecosystem.",
  "Red flags": "Aggregated risk signals (sudden closures, trends). Higher = fewer flags.",
};

function overallTone(score: number) {
  if (score >= 65) return { color: "text-verdict-proceed", ring: "ring-verdict-proceed/30", glow: "drop-shadow-[0_0_18px_rgba(34,211,162,0.35)]" };
  if (score >= 40) return { color: "text-verdict-caution", ring: "ring-verdict-caution/30", glow: "drop-shadow-[0_0_18px_rgba(245,181,68,0.35)]" };
  return { color: "text-verdict-avoid", ring: "ring-verdict-avoid/30", glow: "drop-shadow-[0_0_18px_rgba(240,106,106,0.35)]" };
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-md ${className}`} />;
}

function DetailSkeleton() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-3">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-8 w-2/3" />
        <div className="flex gap-3">
          <SkeletonLine className="h-5 w-28" />
          <SkeletonLine className="h-5 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-1/2" />
        <SkeletonLine className="h-4 w-1/3" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-accent-500/20 hover:bg-accent-500/[0.03]">
      <div className="mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-100 tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">
        {caption}
      </div>
    </div>
  );
}

function SectionHeader({ children, index }: { children: React.ReactNode; index: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="mono text-[10px] tracking-[0.2em] text-slate-600">{index}</span>
      <div className="h-px flex-1 bg-white/5" />
      <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {children}
      </h3>
    </div>
  );
}

export default function DetailPanel({
  report,
  competitors,
  isLoading,
  onPulseCompetitor,
  onBack,
}: DetailPanelProps) {
  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="glass-strong relative z-20 flex h-full w-full flex-col overflow-hidden border-l border-white/5 shadow-panel md:w-[55%]"
    >
      {/* Top bar with back button */}
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <button
          onClick={onBack}
          className="group/back flex items-center gap-2 text-xs text-slate-400 transition hover:text-accent-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover/back:-translate-x-0.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="mono uppercase tracking-[0.16em]">Back to globe</span>
        </button>
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
          Risk report
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || !report ? (
          <DetailSkeleton />
        ) : (
          <ReportBody
            report={report}
            competitors={competitors}
            onPulseCompetitor={onPulseCompetitor}
          />
        )}
      </div>
    </motion.aside>
  );
}

function ReportBody({
  report,
  competitors,
  onPulseCompetitor,
}: {
  report: Report;
  competitors: Competitor[] | undefined;
  onPulseCompetitor: (index: number) => void;
}) {
  const { business, verdict, overall_score, scores, details } = report;
  const tone = overallTone(overall_score);
  const crumbs = business.category.split(">").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-10 px-8 py-8">
      {/* ----- Header ------------------------------------------------------ */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="space-y-4"
      >
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={i === crumbs.length - 1 ? "text-accent-300" : ""}>
                {c}
              </span>
              {i < crumbs.length - 1 && <span className="text-slate-700">/</span>}
            </span>
          ))}
        </nav>

        <div className="flex items-start justify-between gap-6">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
            {business.name}
          </h2>
          <div className="shrink-0 text-right">
            <div
              className={`mono text-[clamp(2.25rem,4vw,3.25rem)] font-light leading-none tabular-nums ${tone.color} ${tone.glow}`}
            >
              {overall_score.toFixed(1)}
            </div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">
              / 100 overall
            </div>
          </div>
        </div>

        <div>
          <VerdictBadge verdict={verdict} />
        </div>
      </motion.header>

      {/* ----- Location --------------------------------------------------- */}
      <section>
        <SectionHeader index="01">Location</SectionHeader>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="text-sm leading-relaxed text-slate-200">
            <div>{business.address}</div>
            <div className="text-slate-400">
              {business.locality}, {business.region} {business.postcode}
            </div>
          </div>
          <div className="mono mt-3 flex items-center gap-3 border-t border-white/5 pt-3 text-[11px] text-slate-500">
            <span className="uppercase tracking-widest text-slate-600">Lat</span>
            <span className="text-slate-300 tabular-nums">
              {business.latitude.toFixed(4)}
            </span>
            <span className="text-slate-700">·</span>
            <span className="uppercase tracking-widest text-slate-600">Lng</span>
            <span className="text-slate-300 tabular-nums">
              {business.longitude.toFixed(4)}
            </span>
          </div>
        </div>
      </section>

      {/* ----- Score breakdown -------------------------------------------- */}
      <section>
        <SectionHeader index="02">Signal breakdown</SectionHeader>
        <div className="space-y-5">
          <ScoreBar label="Saturation" value={scores.saturation} tooltip={SCORE_TOOLTIPS.Saturation} />
          <ScoreBar label="Churn" value={scores.churn} tooltip={SCORE_TOOLTIPS.Churn} />
          <ScoreBar label="Stability" value={scores.stability} tooltip={SCORE_TOOLTIPS.Stability} />
          <ScoreBar label="Diversity" value={scores.diversity} tooltip={SCORE_TOOLTIPS.Diversity} />
          <ScoreBar label="Red flags" value={scores.red_flags} tooltip={SCORE_TOOLTIPS["Red flags"]} />
        </div>
      </section>

      {/* ----- Stats grid ------------------------------------------------- */}
      <section>
        <SectionHeader index="03">By the numbers</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Competitors"
            value={String(details.competitors_nearby)}
            caption="Direct rivals within a short radius"
          />
          <StatCard
            label="Closure rate"
            value={`${(details.category_closure_rate * 100).toFixed(1)}%`}
            caption="Annual rate for this category nearby"
          />
          <StatCard
            label="Avg. age"
            value={`${details.avg_competitor_age_years.toFixed(1)} years`}
            caption="How long competitors have operated"
          />
          <StatCard
            label="Ecosystem"
            value={String(details.ecosystem_categories)}
            caption="Distinct categories surrounding this spot"
          />
        </div>
      </section>

      {/* ----- Competitors ------------------------------------------------ */}
      <section>
        <SectionHeader index="04">Nearby competitors</SectionHeader>
        {competitors ? (
          <CompetitorList competitors={competitors} onPulse={onPulseCompetitor} />
        ) : (
          <div className="space-y-2">
            <SkeletonLine className="h-14 w-full" />
            <SkeletonLine className="h-14 w-full" />
            <SkeletonLine className="h-14 w-full" />
          </div>
        )}
      </section>

      <footer className="mono pb-4 pt-2 text-center text-[10px] uppercase tracking-[0.2em] text-slate-700">
        GapMap · risk screen v0.1
      </footer>
    </div>
  );
}
