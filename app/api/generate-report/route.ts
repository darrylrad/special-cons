import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Report } from "@/src/api/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const report: Report = body;
  const yelpData = body.yelpData ?? null;
  const { business, verdict, overall_score, scores, details } = report;

  const verdictGuidance: Record<string, string> = {
    PROCEED: "The overall commercial risk profile is acceptable. Frame risk flags as areas to monitor rather than blockers.",
    "PROCEED WITH CAUTION": "The commercial risk profile presents material concerns. Frame risk flags as conditions that must be addressed in negotiation or post-acquisition planning.",
    AVOID: "The commercial risk profile presents significant risk. Frame risk flags as deal-level concerns that challenge the fundamental viability of this acquisition.",
  };

  const yelpSection = yelpData
    ? `
YELP MARKET SIGNALS
Target Yelp Rating: ${yelpData.rating}/5 stars
Review Volume: ${yelpData.review_count} reviews${yelpData.price ? `\nPrice Tier: ${yelpData.price}` : ""}
Competitive Rating Position: ${yelpData.competitive_avg_rating !== null ? `${yelpData.rating} vs ${yelpData.competitive_avg_rating} area average (${yelpData.rating >= yelpData.competitive_avg_rating ? "+" : ""}${(yelpData.rating - yelpData.competitive_avg_rating).toFixed(1)})` : "Insufficient competitor data"}
Customer Sentiment Score: ${yelpData.scores.sentiment}/100
Market Traction Score: ${yelpData.scores.traction}/100
Competitive Advantage Score: ${yelpData.scores.competitive}/100`
    : "";

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `You are a senior commercial due diligence analyst at a boutique M&A advisory firm specialising in small business acquisitions.

You write structured insight sections for transaction advisors and business brokers. Your outputs are used directly in client-facing advisory reports and must meet professional standards.

Your language is precise, formal, and risk-oriented. You do not use consumer-friendly language, marketing language, or generic phrases. You write as if a sophisticated buyer's advisor will scrutinise every word.

You must respond with a valid JSON object only — no markdown, no preamble, no explanation. The object must have exactly these four keys:
- "opportunity": One sentence on the strongest positive signal in this location profile.
- "risk": One sentence on the most material commercial risk.
- "competitor": One sentence on the competitive landscape and what it means for the acquisition.
- "nextStep": One actionable sentence on what the advisor should validate before proceeding.`,

    messages: [
      {
        role: "user",
        content: `Prepare the AI-powered insight section for the following acquisition target.

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
— Interpretation: ${scores.saturation >= 65 ? "Moderate to low competitive density" : scores.saturation >= 40 ? "Elevated competitive density" : "High competitive density — market is crowded"}

Category Stability Score: ${scores.churn.toFixed(1)}/100
— Interpretation: ${scores.churn >= 65 ? "Category demonstrates stable operating conditions" : scores.churn >= 40 ? "Category shows moderate attrition" : "Category shows elevated historical attrition"}

Ecosystem Diversity Score: ${scores.diversity.toFixed(1)}/100
— Interpretation: ${scores.diversity >= 65 ? "Diverse surrounding commercial ecosystem" : scores.diversity >= 40 ? "Moderate surrounding commercial diversity" : "Limited surrounding commercial diversity"}

SUPPORTING METRICS
Direct category competitors in area: ${details.competitors_nearby}
Annual closure rate (category, area): ${(details.category_closure_rate * 100).toFixed(1)}%
Average competitor operating tenure: ${details.avg_competitor_age_years.toFixed(1)} years
Surrounding business category count: ${details.ecosystem_categories}
${yelpSection}
Respond with the JSON object only.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  try {
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const insight = JSON.parse(jsonStr);
    return NextResponse.json({ insight });
  } catch {
    console.error("[generate-report] JSON parse failed:", raw);
    return NextResponse.json({ insight: null });
  }
}
