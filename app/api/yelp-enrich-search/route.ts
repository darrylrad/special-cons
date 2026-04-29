import { NextRequest, NextResponse } from "next/server";

const YELP_BASE = "https://api.yelp.com/v3";

const STATE_ABBR: Record<string, string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
  "District of Columbia":"DC",
};
function toStateCode(s: string) { return s.length === 2 ? s.toUpperCase() : (STATE_ABBR[s] ?? s); }

function yelpHeaders() {
  return { Authorization: `Bearer ${process.env.YELP_API_KEY}`, Accept: "application/json" };
}

interface SearchInput {
  fsq_place_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  overall_score: number;
}

async function enrichOne(input: SearchInput): Promise<{ fsq_place_id: string; score: number } | null> {
  const stateCode = toStateCode(input.state);
  const nameLower = input.name.toLowerCase();

  const matchParams = new URLSearchParams({
    name: input.name, address1: input.address, city: input.city,
    state: stateCode, country: "US", limit: "1",
  });
  const nameSearchParams = new URLSearchParams({
    term: input.name, location: `${input.city}, ${stateCode}`, limit: "5",
  });

  try {
    const [matchRes, nameRes] = await Promise.all([
      fetch(`${YELP_BASE}/businesses/matches?${matchParams}`, { headers: yelpHeaders() }),
      fetch(`${YELP_BASE}/businesses/search?${nameSearchParams}`, { headers: yelpHeaders() }),
    ]);

    const matchData = matchRes.ok ? await matchRes.json() : null;
    const nameData = nameRes.ok ? await nameRes.json() : null;
    const nameResults: any[] = nameData?.businesses ?? [];

    const matchedId: string | null = matchData?.businesses?.[0]?.id ?? null;

    // Find business: ID match → name match → address match
    let biz = matchedId ? nameResults.find((b) => b.id === matchedId) : null;
    if (!biz) {
      biz = nameResults.find(
        (b) => b.name.toLowerCase().includes(nameLower) || nameLower.includes(b.name.toLowerCase())
      ) ?? null;
    }
    if (!biz) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      const fsqTokens = norm(input.address).split(/\s+/).slice(0, 3).join(" ");
      biz = nameResults.find((b) => {
        const yTokens = norm(b.location?.address1 ?? "").split(/\s+/).slice(0, 3).join(" ");
        return yTokens.length > 0 && yTokens === fsqTokens;
      }) ?? null;
    }
    if (!biz) return null;

    const rating: number = biz.rating ?? 0;
    const reviewCount: number = biz.review_count ?? 0;
    if (reviewCount === 0) return null;

    const sentiment = Math.round(((rating - 1) / 4) * 100);
    const traction = Math.min(100, Math.round((Math.log10(Math.max(reviewCount, 1)) / 3) * 100));
    const yelpAvg = (sentiment + traction) / 2;
    const score = Math.round((input.overall_score * 0.6 + yelpAvg * 0.4) * 10) / 10;

    return { fsq_place_id: input.fsq_place_id, score };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { results }: { results: SearchInput[] } = await req.json();
  const enriched = await Promise.all(results.map(enrichOne));
  const out: Record<string, number> = {};
  for (const e of enriched) {
    if (e) out[e.fsq_place_id] = e.score;
  }
  return NextResponse.json(out);
}
