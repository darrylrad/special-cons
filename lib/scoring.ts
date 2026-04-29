import type { YelpData, YelpCompetitorData } from "@/src/api/types";

// 60% location signals + 40% Yelp (sentiment + traction only).
// Competitive advantage is excluded from the score because it depends on the
// search context (radius, term) and differs between the target and competitor
// API routes — making it unstable across views of the same business.
export function enrichedScore(baseScore: number, yelp: YelpData | null): number {
  if (!yelp) return baseScore;
  const yelpAvg = (yelp.scores.sentiment + yelp.scores.traction) / 2;
  return Math.round((baseScore * 0.6 + yelpAvg * 0.4) * 10) / 10;
}

export function competitorEnrichedScore(baseScore: number, yelp: YelpCompetitorData | null): number {
  if (!yelp) return baseScore;
  const yelpAvg = (yelp.scores.sentiment + yelp.scores.traction) / 2;
  return Math.round((baseScore * 0.6 + yelpAvg * 0.4) * 10) / 10;
}

export function scoreTone(score: number) {
  if (score >= 65) return {
    color: "text-verdict-proceed",
    glow: "drop-shadow-[0_0_18px_rgba(34,211,162,0.35)]",
  };
  if (score >= 40) return {
    color: "text-verdict-caution",
    glow: "drop-shadow-[0_0_18px_rgba(245,181,68,0.35)]",
  };
  return {
    color: "text-verdict-avoid",
    glow: "drop-shadow-[0_0_18px_rgba(240,106,106,0.35)]",
  };
}
