"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Report } from "@/src/api/types";
import { generateReport, buildPdf } from "@/lib/reportUtils";
import ScoreBar from "./ScoreBar";
import VerdictBadge from "./VerdictBadge";

interface ReportModalProps {
  report: Report;
  onClose: () => void;
}

const SCORE_TOOLTIPS: Record<string, string> = {
  saturation: "How crowded the market is nearby. Higher = less saturated, more room.",
  churn: "Rate businesses in this category open and close. Higher = more stable turnover.",
  diversity: "Variety of surrounding business categories. Higher = healthier ecosystem.",
};

const SCORE_LABELS: Record<string, string> = {
  saturation: "Market Saturation",
  churn: "Business Turnover",
  diversity: "Ecosystem Diversity",
};

function BoldText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="text-slate-200 font-semibold">{part}</strong> : part
      )}
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="mono text-sm text-slate-200 tabular-nums">{value}</span>
    </div>
  );
}

export default function ReportModal({ report, onClose }: ReportModalProps) {
  const { business, verdict, overall_score, scores, details } = report;
  const generated = generateReport(report);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    })
      .then((r) => r.json())
      .then((data) => setAiSummary(data.summary))
      .catch(() => setAiError(true))
      .finally(() => setAiLoading(false));
  }, []);

  function handleDownload() {
    const doc = buildPdf(report, generated, aiSummary);
    const slug = business.name.toLowerCase().replace(/\s+/g, "-");
    doc.save(`acquira-report-${slug}.pdf`);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        style={{ backdropFilter: "blur(12px)", background: "rgba(8,10,18,0.75)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="glass-strong relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-7 py-5">
            <div>
              <div className="mono text-[9px] uppercase tracking-[0.22em] text-slate-600">
                Acquisition Report
              </div>
              <div className="mt-0.5 text-base font-semibold leading-snug text-slate-100">
                {business.name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="mono flex items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-accent-300 transition hover:bg-accent-500/20 active:scale-95"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                aria-label="Close"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">

            {/* Overall score + verdict */}
            <div className="flex items-center justify-between">
              <div>
                <VerdictBadge verdict={verdict} />
                <div className="mono mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                  {business.locality}, {business.region}
                </div>
              </div>
              <div className="text-right">
                <div className="mono text-[3rem] font-light leading-none tabular-nums text-slate-100">
                  {overall_score.toFixed(1)}
                </div>
                <div className="mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  / 100 overall
                </div>
              </div>
            </div>

            {/* Executive summary */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="mono mb-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Summary
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {generated.executiveSummary}
              </p>
            </div>

            {/* Score breakdown */}
            <div>
              <div className="mono mb-4 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Signal Breakdown
              </div>
              <div className="space-y-5">
                {Object.entries(scores).map(([key, value]) => (
                  <div key={key}>
                    <ScoreBar
                      label={SCORE_LABELS[key] ?? key}
                      value={value}
                      tooltip={SCORE_TOOLTIPS[key] ?? ""}
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      {generated.scoreAnalysis.find((s) => s.title === (SCORE_LABELS[key] ?? key))?.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key metrics */}
            <div>
              <div className="mono mb-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                Key Metrics
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5">
                <StatRow label="Competitors nearby" value={String(details.competitors_nearby)} />
                <StatRow label="Annual closure rate" value={`${(details.category_closure_rate * 100).toFixed(1)}%`} />
                <StatRow label="Avg. competitor age" value={`${details.avg_competitor_age_years.toFixed(1)} years`} />
                <StatRow label="Ecosystem categories" value={String(details.ecosystem_categories)} />
              </div>
            </div>

            {/* Strengths + risks */}
            {(generated.strengths.length > 0 || generated.risks.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {generated.strengths.length > 0 && (
                  <div>
                    <div className="mono mb-2 text-[9px] uppercase tracking-[0.2em] text-verdict-proceed/70">
                      Strengths
                    </div>
                    <ul className="space-y-1.5">
                      {generated.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] leading-snug text-slate-400">
                          <span className="mt-0.5 text-verdict-proceed">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {generated.risks.length > 0 && (
                  <div>
                    <div className="mono mb-2 text-[9px] uppercase tracking-[0.2em] text-verdict-avoid/70">
                      Risk Factors
                    </div>
                    <ul className="space-y-1.5">
                      {generated.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] leading-snug text-slate-400">
                          <span className="mt-0.5 text-verdict-avoid">−</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* AI summary */}
            <div className="rounded-xl border border-accent-500/20 bg-accent-500/[0.03] p-5">
              <div className="mono mb-2 text-[9px] uppercase tracking-[0.2em] text-accent-400/70">
                AI-Powered Insight
              </div>
              {aiLoading && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Generating insight…
                </div>
              )}
              {aiError && (
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Unable to generate AI insight at this time.
                </p>
              )}
              {aiSummary && (
                <p className="text-sm leading-relaxed text-slate-300">
                  <BoldText text={aiSummary} />
                </p>
              )}
            </div>

            <footer className="mono pb-2 text-center text-[9px] uppercase tracking-[0.2em] text-slate-700">
              Acquira · Risk Screen · Confidential
            </footer>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
