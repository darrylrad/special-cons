import type { Report } from "@/src/api/types";

export interface ReportSection {
  title: string;
  content: string;
}

export interface GeneratedReport {
  executiveSummary: string;
  scoreAnalysis: ReportSection[];
  strengths: string[];
  risks: string[];
}

// Add new metrics here as scoring expands — one entry per signal.
const SCORE_NARRATIVES: Record<
  string,
  (value: number) => string
> = {
  saturation: (v) => {
    if (v >= 70) return "The area has relatively few direct competitors, suggesting meaningful room in the market for a new operator.";
    if (v >= 50) return "Competition is moderate — manageable for a well-positioned operator with a clear value proposition.";
    if (v >= 30) return "The market is fairly saturated with similar businesses, requiring strong differentiation to compete.";
    return "Heavy competition in this area makes differentiation critical and survival challenging for new entrants.";
  },
  churn: (v) => {
    if (v >= 70) return "Historical closure rates are low, indicating a stable operating environment where businesses tend to survive.";
    if (v >= 50) return "Turnover in this category is around average — some risk present but not alarming for a prepared operator.";
    if (v >= 30) return "Above-average closure rates suggest challenging conditions for this category in this area.";
    return "High historical closure rates signal significant business risk — most similar businesses in this area have not survived.";
  },
  diversity: (v) => {
    if (v >= 70) return "A diverse surrounding ecosystem suggests healthy foot traffic and cross-pollination between business categories.";
    if (v >= 50) return "Moderate business diversity in the area provides reasonable ecosystem support for this location.";
    if (v >= 30) return "Limited category diversity may restrict organic customer flow and limit the surrounding support network.";
    return "Poor ecosystem diversity indicates a weak surrounding business environment that may not support long-term viability.";
  },
};

// Maps score keys to display labels — extend when new metrics are added.
const SCORE_LABELS: Record<string, string> = {
  saturation: "Market Saturation",
  churn: "Business Turnover",
  diversity: "Ecosystem Diversity",
};

export function generateReport(report: Report): GeneratedReport {
  const { overall_score, business, scores, details } = report;

  // Executive summary
  let executiveSummary: string;
  if (overall_score >= 65) {
    executiveSummary =
      `${business.name} presents a favourable acquisition opportunity, scoring ${overall_score.toFixed(1)} out of 100. ` +
      `Market signals indicate manageable competition and a stable operating environment for this category. ` +
      `A well-capitalised operator with strong execution has a credible path to success at this location.`;
  } else if (overall_score >= 40) {
    executiveSummary =
      `${business.name} carries moderate acquisition risk, scoring ${overall_score.toFixed(1)} out of 100. ` +
      `Some market signals are encouraging, but notable risk factors warrant careful due diligence before committing. ` +
      `Proceeding requires a clear operational strategy that directly addresses the identified weaknesses.`;
  } else {
    executiveSummary =
      `${business.name} presents significant acquisition risk, scoring ${overall_score.toFixed(1)} out of 100. ` +
      `Multiple risk signals indicate challenging market conditions for this category and location. ` +
      `A thorough evaluation of turnaround potential is strongly advised before making any acquisition decision.`;
  }

  // Score analysis — iterates over whatever keys exist in scores
  const scoreAnalysis: ReportSection[] = Object.entries(scores).map(([key, value]) => ({
    title: SCORE_LABELS[key] ?? key,
    content: SCORE_NARRATIVES[key]?.(value) ?? `Score: ${value.toFixed(1)}/100`,
  }));

  // Strengths
  const strengths: string[] = [];
  Object.entries(scores).forEach(([key, value]) => {
    if (value >= 60) {
      strengths.push(`${SCORE_LABELS[key] ?? key} (${value.toFixed(1)}/100)`);
    }
  });
  if (details.avg_competitor_age_years >= 5) {
    strengths.push(`Competitors average ${details.avg_competitor_age_years.toFixed(1)} years — proven demand`);
  }
  if (details.category_closure_rate < 0.10) {
    strengths.push(`${(details.category_closure_rate * 100).toFixed(1)}% annual closure rate — very stable`);
  }

  // Risks
  const risks: string[] = [];
  Object.entries(scores).forEach(([key, value]) => {
    if (value < 45) {
      risks.push(`${SCORE_LABELS[key] ?? key} (${value.toFixed(1)}/100)`);
    }
  });
  if (details.competitors_nearby >= 8) {
    risks.push(`${details.competitors_nearby} direct competitors nearby — intense competition`);
  }
  if (details.category_closure_rate >= 0.20) {
    risks.push(`${(details.category_closure_rate * 100).toFixed(1)}% annual closure rate — high attrition`);
  }

  return { executiveSummary, scoreAnalysis, strengths, risks };
}

export function buildPdf(report: Report, generated: GeneratedReport, aiSummary?: string | null) {
  const { jsPDF } = require("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { business, overall_score, verdict, scores, details } = report;

  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;
  const footerH = 14;
  const maxY = pageH - footerH - 5;
  let y = margin;

  const verdictColor: Record<string, [number, number, number]> = {
    PROCEED: [34, 211, 162],
    "PROCEED WITH CAUTION": [245, 181, 68],
    AVOID: [240, 106, 106],
  };
  const [vr, vg, vb] = verdictColor[verdict] ?? [100, 100, 100];

  function addFooter() {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    const total = doc.internal.pages.length - 1;
    doc.setFillColor(15, 17, 26);
    doc.rect(0, pageH - footerH, pageW, footerH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 140);
    doc.text("Acquira · Risk Screen", margin, pageH - 5);
    doc.text(`Page ${pg} of ${total}  ·  Confidential`, pageW - margin, pageH - 5, { align: "right" });
  }

  function checkPage(needed: number) {
    if (y + needed > maxY) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  }

  // Header bar (first page only)
  doc.setFillColor(15, 17, 26);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(240, 242, 255);
  doc.text("ACQUISITION RISK REPORT", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 140);
  doc.text(`Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, margin, 20);
  y = 40;

  // Business name + score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 22, 35);
  doc.text(business.name, margin, y);
  doc.setFontSize(28);
  doc.setTextColor(vr, vg, vb);
  doc.text(`${overall_score.toFixed(1)}`, pageW - margin, y, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 140);
  doc.text("/ 100", pageW - margin, y + 6, { align: "right" });
  y += 10;

  // Verdict pill
  doc.setFillColor(vr, vg, vb);
  doc.roundedRect(margin, y, 50, 7, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 17, 26);
  doc.text(verdict, margin + 25, y + 4.8, { align: "center" });
  y += 16;

  // Address
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 110);
  doc.text(`${business.address}, ${business.locality}, ${business.region} ${business.postcode}`, margin, y);
  y += 12;

  // Divider
  doc.setDrawColor(220, 224, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Executive summary
  checkPage(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 22, 35);
  doc.text("EXECUTIVE SUMMARY", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 55, 75);
  const summaryLines = doc.splitTextToSize(generated.executiveSummary, contentW);
  checkPage(summaryLines.length * 5 + 10);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  // Score breakdown
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 22, 35);
  doc.text("SIGNAL BREAKDOWN", margin, y);
  y += 8;

  Object.entries(scores).forEach(([key, value]) => {
    checkPage(16);
    const label = SCORE_LABELS[key] ?? key;
    const [br, bg, bb] = value >= 65 ? [34, 211, 162] : value >= 40 ? [245, 181, 68] : [240, 106, 106];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 75);
    doc.text(label, margin, y);
    doc.setTextColor(br, bg, bb);
    doc.setFont("helvetica", "bold");
    doc.text(`${value.toFixed(1)}`, pageW - margin, y, { align: "right" });
    y += 4;
    doc.setFillColor(220, 224, 235);
    doc.roundedRect(margin, y, contentW, 3, 1, 1, "F");
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(margin, y, (value / 100) * contentW, 3, 1, 1, "F");
    y += 9;
  });

  checkPage(10);
  doc.setDrawColor(220, 224, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Key metrics
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 22, 35);
  doc.text("KEY METRICS", margin, y);
  y += 8;

  const metrics = [
    ["Competitors nearby", String(details.competitors_nearby)],
    ["Annual closure rate", `${(details.category_closure_rate * 100).toFixed(1)}%`],
    ["Avg. competitor age", `${details.avg_competitor_age_years.toFixed(1)} years`],
    ["Ecosystem categories", String(details.ecosystem_categories)],
  ];

  metrics.forEach(([label, value]) => {
    checkPage(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 110);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 22, 35);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 7;
  });

  checkPage(10);
  doc.setDrawColor(220, 224, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Strengths + risks
  if (generated.strengths.length > 0 || generated.risks.length > 0) {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 22, 35);
    doc.text("STRENGTHS", margin, y);
    doc.text("RISK FACTORS", margin + contentW / 2 + 5, y);
    y += 7;

    const maxRows = Math.max(generated.strengths.length, generated.risks.length);
    for (let i = 0; i < maxRows; i++) {
      checkPage(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (generated.strengths[i]) {
        doc.setTextColor(34, 150, 110);
        const lines = doc.splitTextToSize(`• ${generated.strengths[i]}`, contentW / 2 - 5);
        doc.text(lines, margin, y);
      }
      if (generated.risks[i]) {
        doc.setTextColor(200, 60, 60);
        const lines = doc.splitTextToSize(`• ${generated.risks[i]}`, contentW / 2 - 5);
        doc.text(lines, margin + contentW / 2 + 5, y);
      }
      y += 7;
    }
    y += 6;
  }

  // AI insight
  const aiText = aiSummary ?? "AI narrative summary not available.";
  doc.setFontSize(8.5);

  // Normalize newlines to spaces — jsPDF auto-advances y for \n in doc.text(),
  // which breaks our manual ly tracking and causes lines to overlap.
  const aiTextNorm = aiText.replace(/[\r\n]+/g, " ");

  // Parse text into bold/normal segments
  const rawSegments: Array<{ text: string; bold: boolean }> = [];
  aiTextNorm.split(/\*\*(.*?)\*\*/g).forEach((part, i) => {
    if (part) rawSegments.push({ text: part, bold: i % 2 === 1 });
  });

  // Word-wrap segments into lines preserving bold info
  const wrappedLines: Array<Array<{ text: string; bold: boolean }>> = [[]];
  let lineW = 0;
  const maxLineW = contentW - 14;

  for (const { text, bold } of rawSegments) {
    for (const token of text.split(/(\s+)/)) {
      if (!token) continue;
      const isSpace = /^\s+$/.test(token);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const tw = doc.getTextWidth(token);

      if (isSpace) {
        if (lineW === 0) continue; // skip leading space on a freshly wrapped line
      } else if (lineW > 0 && lineW + tw > maxLineW) {
        wrappedLines.push([]);
        lineW = 0;
      }

      const cur = wrappedLines[wrappedLines.length - 1];
      const last = cur[cur.length - 1];
      if (last && last.bold === bold) {
        last.text += token;
      } else {
        cur.push({ text: token, bold });
      }
      lineW += tw;
    }
  }

  // Use normal font for a consistent lineH measurement
  doc.setFont("helvetica", "normal");
  const lineH = doc.getLineHeight() / doc.internal.scaleFactor;
  const aiBoxH = wrappedLines.length * lineH + 22;
  checkPage(aiBoxH + 5);

  doc.setFillColor(240, 245, 255);
  doc.roundedRect(margin, y, contentW, aiBoxH, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 100, 160);
  doc.text("AI-POWERED INSIGHT", margin + 5, y + 7);

  doc.setFontSize(8.5);
  doc.setTextColor(aiSummary ? 40 : 120, aiSummary ? 50 : 130, aiSummary ? 80 : 160);
  let ly = y + 15;
  wrappedLines.forEach((line) => {
    let lx = margin + 5;
    line.forEach(({ text, bold }) => {
      if (!text) return;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, lx, ly);
      lx += doc.getTextWidth(text);
    });
    ly += lineH;
  });
  y = ly + 6;

  addFooter();
  return doc;
}
