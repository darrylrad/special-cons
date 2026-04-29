import { NextRequest, NextResponse } from "next/server";
import type { YelpCompetitorData } from "@/src/api/types";

const YELP_BASE = "https://api.yelp.com/v3";

function yelpHeaders() {
  return {
    Authorization: `Bearer ${process.env.YELP_API_KEY}`,
    Accept: "application/json",
  };
}

interface CompetitorInput {
  fsq_place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function addrTokens(s: string) {
  return norm(s).split(/\s+/).slice(0, 3).join(" ");
}

function matchCompetitor(comp: CompetitorInput, businesses: any[]): any | null {
  const nameLower = norm(comp.name);
  const fsqAddr = addrTokens(comp.address);

  // All name matches — could be multiple branches of the same chain
  const nameMatches = businesses.filter((b) => {
    const bn = norm(b.name ?? "");
    return bn.includes(nameLower) || nameLower.includes(bn);
  });

  // Among name matches, prefer the one at the correct address (handles chains)
  if (nameMatches.length > 0 && fsqAddr) {
    const exact = nameMatches.find((b) => {
      const ya = addrTokens(b.location?.address1 ?? "");
      return ya.length > 0 && ya === fsqAddr;
    });
    if (exact) return exact;
  }

  // Only one name match — unambiguous, safe to use
  if (nameMatches.length === 1) return nameMatches[0];

  // Address-only fallback — handles renamed/rebranded businesses at the same location
  if (fsqAddr) {
    const byAddr = businesses.find((b) => {
      const ya = addrTokens(b.location?.address1 ?? "");
      return ya.length > 0 && ya === fsqAddr;
    });
    if (byAddr) return byAddr;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { competitors, targetLat, targetLng, category }: {
    competitors: CompetitorInput[];
    targetLat: number;
    targetLng: number;
    category?: string;
  } = await req.json();

  if (!competitors.length) return NextResponse.json({});

  // Two parallel Yelp searches — always exactly 2 calls regardless of competitor count:
  // 1. Category-filtered (radius 2000) — finds same-type competitors
  // 2. No-term broad (radius 1000) — finds popular nearby businesses in any category,
  //    catching renamed businesses or those in adjacent categories the first search misses
  const categoryTerm = category ? (category.split(">").pop()?.trim() ?? category) : undefined;

  const categoryParams = new URLSearchParams({
    latitude: String(targetLat),
    longitude: String(targetLng),
    radius: "2000",
    limit: "50",
    ...(categoryTerm ? { term: categoryTerm } : {}),
  });

  const broadParams = new URLSearchParams({
    latitude: String(targetLat),
    longitude: String(targetLng),
    radius: "1000",
    limit: "50",
  });

  const [categoryRes, broadRes] = await Promise.all([
    fetch(`${YELP_BASE}/businesses/search?${categoryParams}`, { headers: yelpHeaders() }),
    fetch(`${YELP_BASE}/businesses/search?${broadParams}`, { headers: yelpHeaders() }),
  ]);

  if (!categoryRes.ok && !broadRes.ok) return NextResponse.json({});

  const categoryData = categoryRes.ok ? await categoryRes.json() : { businesses: [] };
  const broadData = broadRes.ok ? await broadRes.json() : { businesses: [] };

  // Merge both pools, deduplicate by Yelp business ID
  const seen = new Set<string>();
  const businesses: any[] = [];
  for (const b of [...(categoryData.businesses ?? []), ...(broadData.businesses ?? [])]) {
    if (!b.is_closed && !seen.has(b.id)) {
      seen.add(b.id);
      businesses.push(b);
    }
  }

  // Area avg rating from merged pool — used as competitive baseline
  const rated = businesses.filter((b) => b.rating && b.review_count > 0);
  const areaAvgRating = rated.length > 0
    ? rated.reduce((sum: number, b: any) => sum + b.rating, 0) / rated.length
    : null;

  const yelpMap: Record<string, YelpCompetitorData> = {};

  for (const comp of competitors) {
    const match = matchCompetitor(comp, businesses);
    if (!match) continue;

    const rating: number = match.rating ?? 0;
    const reviewCount: number = match.review_count ?? 0;
    if (reviewCount === 0) continue;

    const diff = areaAvgRating !== null ? rating - areaAvgRating : 0;
    const competitive = Math.min(100, Math.max(0, Math.round(50 + (diff / 2) * 50)));

    yelpMap[comp.fsq_place_id] = {
      rating,
      review_count: reviewCount,
      scores: {
        sentiment: Math.round(((rating - 1) / 4) * 100),
        traction: Math.min(100, Math.round((Math.log10(Math.max(reviewCount, 1)) / 3) * 100)),
        competitive,
      },
    };
  }

  return NextResponse.json(yelpMap);
}
