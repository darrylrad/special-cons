import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Report } from "@/src/api/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const report: Report = await req.json();
  const { business, verdict, overall_score, scores, details } = report;

  const verdictGuidance: Record<string, string> = {
    PROCEED: "The overall commercial risk profile is acceptable. Frame risk flags as areas to monitor rather than blockers.",
    "PROCEED WITH CAUTION": "The commercial risk profile presents material concerns. Frame risk flags as conditions that must be addressed in negotiation or post-acquisition planning.",
    AVOID: "The commercial risk profile presents significant risk. Frame risk flags as deal-level concerns that challenge the fundamental viability of this acquisition.",
  };

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: `You are a senior commercial due diligence analyst at a boutique M&A advisory firm specialising in small business acquisitions.

You write sections of commercial due diligence reports for transaction advisors and business brokers. Your outputs are used directly in client-facing advisory reports and must meet professional standards.

Your language is precise, formal, and risk-oriented. You identify commercial risk flags — not opportunities. You do not use consumer-friendly language, marketing language, or generic phrases. You write as if a sophisticated buyer's advisor will scrutinise every word.

Output format: 2–3 concise risk flag statements followed by one concluding advisory sentence. Each risk flag begins with the risk area in bold (e.g. **Market Saturation**, **Category Attrition**, **Ecosystem Dependency**). The concluding sentence states whether the location profile supports, conditionally supports, or does not support proceeding to full due diligence.`,

    messages: [
      {
        role: "user",
        content: `Prepare the commercial due diligence location risk section for the following acquisition target.

TARGET BUSINESS
Name: ${business.name}
Category: ${business.category}
Location: ${business.locality}, ${business.region}

RISK ASSESSMENT SUMMARY
Overall Location Risk Score: ${overall_score.toFixed(1)}/100
Verdict: ${verdict}
${verdictGuidance[verdict] ?? ""}

COMMERCIAL SIGNALS
Market Saturation Score: ${scores.saturation.toFixed(1)}/100
— Higher score indicates lower saturation (less competitive pressure)
— Interpretation: ${scores.saturation >= 65 ? "Moderate to low competitive density" : scores.saturation >= 40 ? "Elevated competitive density" : "High competitive density — market is crowded"}

Category Stability Score: ${scores.churn.toFixed(1)}/100
— Higher score indicates lower historical closure rate (more stable category)
— Interpretation: ${scores.churn >= 65 ? "Category demonstrates stable operating conditions" : scores.churn >= 40 ? "Category shows moderate attrition" : "Category shows elevated historical attrition"}

Ecosystem Diversity Score: ${scores.diversity.toFixed(1)}/100
— Higher score indicates broader surrounding business mix (healthier foot traffic drivers)
— Interpretation: ${scores.diversity >= 65 ? "Diverse surrounding commercial ecosystem" : scores.diversity >= 40 ? "Moderate surrounding commercial diversity" : "Limited surrounding commercial diversity"}

SUPPORTING METRICS
Direct category competitors in area: ${details.competitors_nearby}
Annual closure rate (category, area): ${(details.category_closure_rate * 100).toFixed(1)}%
Average competitor operating tenure: ${details.avg_competitor_age_years.toFixed(1)} years
Surrounding business category count: ${details.ecosystem_categories}

Write the commercial due diligence location risk section now. Do not add headers, preamble, or sign-off. Output only the risk flags and concluding advisory sentence.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ summary: text });
}
