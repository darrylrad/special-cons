"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Competitor, Report, YelpData, YelpCompetitorMap } from "@/src/api";
import { enrichedScore, scoreTone, scoreToVerdict } from "@/lib/scoring";
import VerdictBadge from "./VerdictBadge";
import ScoreBar from "./ScoreBar";
import CompetitorList from "./CompetitorList";
import ReportModal from "./ReportModal";

interface DetailPanelProps {
  report: Report | undefined;
  competitors: Competitor[] | undefined;
  isLoading: boolean;
  onPulseCompetitor: (index: number) => void;
  onBack: () => void;
  yelpCompetitors: YelpCompetitorMap;
  yelpData: YelpData | null;
  yelpLoading: boolean;
}

const LOCATION_TOOLTIPS: Record<string, string> = {
  Saturation: "How crowded the market is nearby. Higher = less saturated, more room.",
  Turnover: "Rate businesses in this category open and close. Higher = more stable turnover.",
  Diversity: "Variety of surrounding business categories. Higher = healthier ecosystem.",
};

const BUSINESS_TOOLTIPS: Record<string, string> = {
  Sentiment: "Customer satisfaction derived from Yelp star rating. Higher = better reviews.",
  Traction: "Market presence derived from Yelp review volume. Higher = more established.",
  Competitive: "This business's rating vs the average of nearby competitors. Higher = outperforms the area.",
};

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
        {Array.from({ length: 3 }).map((_, i) => (
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

function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-accent-500/20 hover:bg-accent-500/[0.03]">
      <div className="mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100 tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">{caption}</div>
    </div>
  );
}

function SectionHeader({ children, index }: { children: React.ReactNode; index: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="mono text-[10px] tracking-[0.2em] text-slate-600">{index}</span>
      <div className="h-px flex-1 bg-white/5" />
      <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{children}</h3>
    </div>
  );
}

export default function DetailPanel({ report, competitors, isLoading, onPulseCompetitor, onBack, yelpCompetitors, yelpData, yelpLoading }: DetailPanelProps) {
  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="glass-strong relative z-20 flex h-full w-full flex-col overflow-hidden border-l border-white/5 shadow-panel"
    >
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
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">Risk report</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading || !report ? (
          <DetailSkeleton />
        ) : (
          <ReportBody
            report={report}
            competitors={competitors}
            onPulseCompetitor={onPulseCompetitor}
            yelpData={yelpData}
            yelpLoading={yelpLoading}
            yelpCompetitors={yelpCompetitors}
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
  yelpData,
  yelpLoading,
  yelpCompetitors,
}: {
  report: Report;
  competitors: Competitor[] | undefined;
  onPulseCompetitor: (index: number) => void;
  yelpData: YelpData | null;
  yelpLoading: boolean;
  yelpCompetitors: YelpCompetitorMap;
}) {
  const [showReport, setShowReport] = useState(false);
  const { business, overall_score, scores, details } = report;
  const crumbs = business.category.split(">").map((s) => s.trim()).filter(Boolean);

  const finalScore = enrichedScore(overall_score, yelpData);
  const tone = scoreTone(finalScore);

  return (
    <div className="space-y-10 px-8 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="space-y-4"
      >
        <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={i === crumbs.length - 1 ? "text-accent-300" : ""}>{c}</span>
              {i < crumbs.length - 1 && <span className="text-slate-700">/</span>}
            </span>
          ))}
        </nav>

        <div className="flex items-start justify-between gap-6">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
            {business.name}
          </h2>
          <div className="shrink-0 text-right">
            <div className={`mono text-[clamp(2.25rem,4vw,3.25rem)] font-light leading-none tabular-nums ${tone.color} ${tone.glow}`}>
              {finalScore.toFixed(1)}
            </div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">
              / 100{yelpData ? " · enriched" : yelpLoading ? " · loading…" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <VerdictBadge verdict={scoreToVerdict(finalScore)} />
          <button
            onClick={() => setShowReport(true)}
            className="mono flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-slate-400 transition hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-accent-300 active:scale-95"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            Generate Report
          </button>
        </div>

        {showReport && (
          <ReportModal
            report={report}
            onClose={() => setShowReport(false)}
            yelpData={yelpData}
            isYelpLoading={yelpLoading}
          />
        )}
      </motion.header>

      {/* Location */}
      <section>
        <SectionHeader index="01">Location</SectionHeader>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="text-sm leading-relaxed text-slate-200">
            <div>{business.address}</div>
            <div className="text-slate-400">{business.locality}, {business.region} {business.postcode}</div>
          </div>
          <div className="mono mt-3 flex items-center gap-3 border-t border-white/5 pt-3 text-[11px] text-slate-500">
            <span className="uppercase tracking-widest text-slate-600">Lat</span>
            <span className="text-slate-300 tabular-nums">{business.latitude.toFixed(4)}</span>
            <span className="text-slate-700">·</span>
            <span className="uppercase tracking-widest text-slate-600">Lng</span>
            <span className="text-slate-300 tabular-nums">{business.longitude.toFixed(4)}</span>
          </div>
        </div>
      </section>

      {/* Location score */}
      <section>
        <SectionHeader index="02">Location Score</SectionHeader>
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3">
          <span className="text-[11px] text-slate-400">Base score (saturation · turnover · diversity)</span>
          <span className={`mono text-lg font-light tabular-nums ${scoreTone(overall_score).color}`}>
            {overall_score.toFixed(1)}
          </span>
        </div>
      </section>

      {/* Location breakdown */}
      <section>
        <SectionHeader index="03">Location breakdown</SectionHeader>
        <div className="space-y-5">
          <ScoreBar label="Saturation" value={scores.saturation} tooltip={LOCATION_TOOLTIPS.Saturation} />
          <ScoreBar label="Turnover" value={scores.churn} tooltip={LOCATION_TOOLTIPS.Turnover} />
          <ScoreBar label="Diversity" value={scores.diversity} tooltip={LOCATION_TOOLTIPS.Diversity} />
        </div>
      </section>

      {/* Business breakdown — only when Yelp data is available */}
      {(yelpData || yelpLoading) && (
        <section>
          <SectionHeader index="04">Business breakdown</SectionHeader>
          {yelpLoading && !yelpData ? (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <SkeletonLine className="h-3 w-28" />
                  <SkeletonLine className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : yelpData ? (
            <div className="space-y-5">
              <ScoreBar label="Sentiment" value={yelpData.scores.sentiment} tooltip={BUSINESS_TOOLTIPS.Sentiment} />
              <ScoreBar label="Traction" value={yelpData.scores.traction} tooltip={BUSINESS_TOOLTIPS.Traction} />
              <ScoreBar label="Competitive" value={yelpData.scores.competitive} tooltip={BUSINESS_TOOLTIPS.Competitive} />
            </div>
          ) : null}
        </section>
      )}

      {/* Stats */}
      <section>
        <SectionHeader index="05">By the numbers</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Competitors" value={String(details.competitors_nearby)} caption="Direct rivals within a short radius" />
          <StatCard label="Closure rate" value={`${(details.category_closure_rate * 100).toFixed(1)}%`} caption="Annual rate for this category nearby" />
          <StatCard label="Avg. age" value={`${details.avg_competitor_age_years.toFixed(1)} years`} caption="How long competitors have operated" />
          <StatCard label="Ecosystem" value={String(details.ecosystem_categories)} caption="Distinct categories surrounding this spot" />
        </div>
      </section>

      {/* Competitors */}
      <section>
        <SectionHeader index="06">Nearby competitors</SectionHeader>
        {competitors ? (
          <CompetitorList
            competitors={competitors}
            onPulse={onPulseCompetitor}
            yelpMap={yelpCompetitors}
          />
        ) : (
          <div className="space-y-2">
            <SkeletonLine className="h-14 w-full" />
            <SkeletonLine className="h-14 w-full" />
            <SkeletonLine className="h-14 w-full" />
          </div>
        )}
      </section>

      <footer className="mono pb-4 pt-2 text-center text-[10px] uppercase tracking-[0.2em] text-slate-700">
        Acquira · risk screen v0.1
      </footer>
    </div>
  );
}
