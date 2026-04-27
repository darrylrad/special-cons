import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Report } from "@/src/api/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const report: Report = await req.json();
  const { business, verdict, overall_score, scores, details } = report;

  const prompt = `You are a business acquisition analyst. Write a concise 3-sentence narrative insight for an investor evaluating this business acquisition opportunity. Focus on the WHY behind the score — what do the signals mean together, and what should the investor pay attention to. Be direct and specific. Do not repeat the numbers verbatim, interpret them.

Business: ${business.name}
Category: ${business.category}
Location: ${business.locality}, ${business.region}
Overall Score: ${overall_score.toFixed(1)}/100
Verdict: ${verdict}

Scores:
- Market Saturation: ${scores.saturation.toFixed(1)}/100 (higher = less crowded)
- Business Turnover: ${scores.churn.toFixed(1)}/100 (higher = more stable)
- Ecosystem Diversity: ${scores.diversity.toFixed(1)}/100 (higher = healthier surroundings)

Key Metrics:
- Direct competitors nearby: ${details.competitors_nearby}
- Annual closure rate for this category: ${(details.category_closure_rate * 100).toFixed(1)}%
- Average competitor age: ${details.avg_competitor_age_years.toFixed(1)} years
- Surrounding business categories: ${details.ecosystem_categories}

Write only the 3-sentence insight. No headers, no bullet points, no preamble.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ summary: text });
}
