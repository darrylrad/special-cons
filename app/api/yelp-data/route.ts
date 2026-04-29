import { NextRequest, NextResponse } from "next/server";

const YELP_BASE = "https://api.yelp.com/v3";

// Yelp Business Match requires 2-letter state codes
const STATE_ABBR: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
};

function toStateCode(state: string): string {
  if (state.length === 2) return state.toUpperCase();
  return STATE_ABBR[state] ?? state;
}

function yelpHeaders() {
  return {
    Authorization: `Bearer ${process.env.YELP_API_KEY}`,
    Accept: "application/json",
  };
}

function sentimentScore(rating: number): number {
  return Math.round(((rating - 1) / 4) * 100);
}

function tractionScore(reviewCount: number): number {
  return Math.min(100, Math.round((Math.log10(Math.max(reviewCount, 1)) / 3) * 100));
}

function competitiveScore(targetRating: number, avgCompRating: number | null): number {
  if (avgCompRating === null) return 50;
  const diff = targetRating - avgCompRating;
  return Math.min(100, Math.max(0, Math.round(50 + (diff / 2) * 50)));
}

export async function POST(req: NextRequest) {
  const { name, address, city, state, latitude, longitude, category } = await req.json();
  const stateCode = toStateCode(state);

  // Competitor search runs in parallel with the target lookup
  const categoryTerm = category.split(">").pop()?.trim() ?? category;
  const searchParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: "1000",
    limit: "20",
    term: categoryTerm,
  });

  const matchParams = new URLSearchParams({
    name,
    address1: address,
    city,
    state: stateCode,
    country: "US",
    limit: "1",
  });

  // Name-based search as fallback — searches Yelp by business name + city
  const nameSearchParams = new URLSearchParams({
    term: name,
    location: `${city}, ${stateCode}`,
    limit: "5",
  });

  const [matchRes, searchRes, nameSearchRes] = await Promise.all([
    fetch(`${YELP_BASE}/businesses/matches?${matchParams}`, { headers: yelpHeaders() }),
    fetch(`${YELP_BASE}/businesses/search?${searchParams}`, { headers: yelpHeaders() }),
    fetch(`${YELP_BASE}/businesses/search?${nameSearchParams}`, { headers: yelpHeaders() }),
  ]);

  if (!searchRes.ok) return NextResponse.json({ found: false });

  const matchData = matchRes.ok ? await matchRes.json() : null;
  const searchData = await searchRes.json();
  const nameSearchData = nameSearchRes.ok ? await nameSearchRes.json() : null;

  const normStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const addrTokens = (s: string) => normStr(s).split(/\s+/).slice(0, 3).join(" ");
  const nameLower = normStr(name);
  const fsqAddrTokens = addrTokens(address);

  function pickFromList(list: any[]): any | null {
    const nameMatches = list.filter((b: any) => {
      const bn = normStr(b.name ?? "");
      return bn.includes(nameLower) || nameLower.includes(bn);
    });
    // Among name matches, prefer the one at the correct address (handles chains)
    if (nameMatches.length > 0 && fsqAddrTokens) {
      const exact = nameMatches.find((b: any) => {
        const ya = addrTokens(b.location?.address1 ?? "");
        return ya.length > 0 && ya === fsqAddrTokens;
      });
      if (exact) return exact;
    }
    // Unambiguous single name match — safe to use
    if (nameMatches.length === 1) return nameMatches[0];
    // Address-only fallback for renamed businesses
    if (fsqAddrTokens) {
      const byAddr = list.find((b: any) => {
        const ya = addrTokens(b.location?.address1 ?? "");
        return ya.length > 0 && ya === fsqAddrTokens;
      });
      if (byAddr) return byAddr;
    }
    return null;
  }

  let target = null;
  let targetId: string | null = matchData?.businesses?.[0]?.id ?? null;

  // Business Match found an address-pinned Yelp ID — fetch full record directly.
  // Bypasses category filtering and handles renamed businesses at the same address.
  if (targetId) {
    const detailRes = await fetch(`${YELP_BASE}/businesses/${targetId}`, { headers: yelpHeaders() });
    if (detailRes.ok) target = await detailRes.json();
  }

  // Fallback: chain-safe match against name search results
  if (!target && nameSearchData?.businesses?.length) {
    target = pickFromList(nameSearchData.businesses);
    if (target) targetId = target.id;
  }

  // Fallback: chain-safe match against coordinate search results
  if (!target && searchData.businesses?.length) {
    target = pickFromList(searchData.businesses);
    if (target) targetId = target.id;
  }

  if (!target) return NextResponse.json({ found: false });

  const competitors = (searchData.businesses ?? []).filter(
    (b: any) => b.id !== targetId && !b.is_closed
  );

  const avgCompRating =
    competitors.length > 0
      ? competitors.reduce((sum: number, b: any) => sum + (b.rating ?? 0), 0) / competitors.length
      : null;

  const rating: number = target.rating ?? 0;
  const reviewCount: number = target.review_count ?? 0;

  return NextResponse.json({
    found: true,
    rating,
    review_count: reviewCount,
    price: target.price ?? null,
    scores: {
      sentiment: sentimentScore(rating),
      traction: tractionScore(reviewCount),
      competitive: competitiveScore(rating, avgCompRating),
    },
    competitive_avg_rating: avgCompRating !== null ? Number(avgCompRating.toFixed(1)) : null,
    competitor_count: competitors.length,
  });
}
