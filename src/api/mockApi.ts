import type {
  Competitor,
  GapMapApi,
  Report,
  SearchResult,
  Verdict,
} from "./types";
import { ApiError } from "./types";

// Simulate network latency so loading skeletons actually show in dev.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = () => 300 + Math.floor(Math.random() * 300);

// A small bank of fake businesses keyed by fsq_place_id. This gives us enough
// variety to exercise all three verdict colors and meaningful pin placement.
interface MockBusiness {
  result: SearchResult;
  report: Report;
  competitors: Competitor[];
}

const verdictFromScore = (score: number): Verdict => {
  if (score >= 65) return "PROCEED";
  if (score >= 40) return "PROCEED WITH CAUTION";
  return "AVOID";
};

const MOCK_DB: Record<string, MockBusiness> = {
  mock_brooklyn_laundry: {
    result: {
      fsq_place_id: "mock_brooklyn_laundry",
      name: "Joe's Laundromat",
      address: "123 Atlantic Ave",
      locality: "Brooklyn",
      region: "NY",
      postcode: "11201",
    },
    report: {
      business: {
        name: "Joe's Laundromat",
        address: "123 Atlantic Ave",
        locality: "Brooklyn",
        region: "NY",
        postcode: "11201",
        latitude: 40.686,
        longitude: -73.978,
        category: "Retail > Laundry > Laundromat",
      },
      verdict: verdictFromScore(54.3),
      overall_score: 54.3,
      scores: {
        saturation: 62.0,
        churn: 41.5,
        stability: 58.2,
        diversity: 71.0,
        red_flags: 45.0,
      },
      details: {
        competitors_nearby: 6,
        category_closure_rate: 0.18,
        avg_competitor_age_years: 4.2,
        ecosystem_categories: 8,
      },
    },
    competitors: [
      { name: "Clean City Laundromat", address: "789 Bergen St, Brooklyn, NY", latitude: 40.682, longitude: -73.975, date_created: "2019-03-15" },
      { name: "Atlantic Wash & Fold", address: "455 Atlantic Ave, Brooklyn, NY", latitude: 40.684, longitude: -73.981, date_created: "2021-07-22" },
      { name: "Smith Street Suds", address: "220 Smith St, Brooklyn, NY", latitude: 40.688, longitude: -73.990, date_created: "2017-11-03" },
      { name: "Boerum Hill Laundry", address: "340 Court St, Brooklyn, NY", latitude: 40.682, longitude: -73.994, date_created: "2016-05-10" },
      { name: "Quick Spin Laundromat", address: "12 Hoyt St, Brooklyn, NY", latitude: 40.690, longitude: -73.987, date_created: "2022-01-18" },
      { name: "Downtown Wash Center", address: "8 DeKalb Ave, Brooklyn, NY", latitude: 40.692, longitude: -73.981, date_created: "2020-09-02" },
    ],
  },

  mock_austin_coffee: {
    result: {
      fsq_place_id: "mock_austin_coffee",
      name: "Riverside Coffee Co.",
      address: "422 E Cesar Chavez St",
      locality: "Austin",
      region: "TX",
      postcode: "78701",
    },
    report: {
      business: {
        name: "Riverside Coffee Co.",
        address: "422 E Cesar Chavez St",
        locality: "Austin",
        region: "TX",
        postcode: "78701",
        latitude: 30.2617,
        longitude: -97.7367,
        category: "Food & Beverage > Cafe > Coffee Shop",
      },
      verdict: verdictFromScore(76.4),
      overall_score: 76.4,
      scores: {
        saturation: 48.0,
        churn: 72.5,
        stability: 81.0,
        diversity: 88.0,
        red_flags: 82.0,
      },
      details: {
        competitors_nearby: 4,
        category_closure_rate: 0.09,
        avg_competitor_age_years: 6.8,
        ecosystem_categories: 14,
      },
    },
    competitors: [
      { name: "Cosmic Coffee + Beer Garden", address: "121 Pickle Rd, Austin, TX", latitude: 30.245, longitude: -97.745, date_created: "2018-04-05" },
      { name: "Houndstooth Coffee", address: "4200 N Lamar Blvd, Austin, TX", latitude: 30.302, longitude: -97.738, date_created: "2010-08-11" },
      { name: "Figure 8 Coffee Purveyors", address: "1111 E 11th St, Austin, TX", latitude: 30.269, longitude: -97.725, date_created: "2015-06-20" },
      { name: "Merit Coffee", address: "710 W 5th St, Austin, TX", latitude: 30.269, longitude: -97.749, date_created: "2012-02-14" },
    ],
  },

  mock_miami_nails: {
    result: {
      fsq_place_id: "mock_miami_nails",
      name: "Glimmer Nail Bar",
      address: "1500 NE 2nd Ave",
      locality: "Miami",
      region: "FL",
      postcode: "33132",
    },
    report: {
      business: {
        name: "Glimmer Nail Bar",
        address: "1500 NE 2nd Ave",
        locality: "Miami",
        region: "FL",
        postcode: "33132",
        latitude: 25.7907,
        longitude: -80.1891,
        category: "Health & Beauty > Nail Salon",
      },
      verdict: verdictFromScore(32.1),
      overall_score: 32.1,
      scores: {
        saturation: 18.0,
        churn: 24.0,
        stability: 38.0,
        diversity: 52.0,
        red_flags: 28.5,
      },
      details: {
        competitors_nearby: 14,
        category_closure_rate: 0.34,
        avg_competitor_age_years: 2.3,
        ecosystem_categories: 5,
      },
    },
    competitors: [
      { name: "Sunset Nails", address: "200 NE 14th St, Miami, FL", latitude: 25.789, longitude: -80.191, date_created: "2022-11-04" },
      { name: "Polished Miami", address: "350 NE 2nd Ave, Miami, FL", latitude: 25.778, longitude: -80.189, date_created: "2023-02-17" },
      { name: "Brickell Nail Lounge", address: "1010 S Miami Ave, Miami, FL", latitude: 25.769, longitude: -80.196, date_created: "2021-08-30" },
      { name: "Edgewater Nails & Spa", address: "3301 NE 1st Ave, Miami, FL", latitude: 25.810, longitude: -80.191, date_created: "2020-04-12" },
      { name: "Wynwood Nail Studio", address: "2250 NW 2nd Ave, Miami, FL", latitude: 25.800, longitude: -80.197, date_created: "2022-06-01" },
    ],
  },
};

// Key lookups are also aliased by lowercase name prefix so search returns results
// that feel responsive to what the user typed.
function matchesQuery(b: MockBusiness, query: string, city?: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystack = `${b.result.name} ${b.result.locality} ${b.report.business.category}`.toLowerCase();
  const queryMatches = haystack.includes(q);
  if (!city) return queryMatches;
  return queryMatches && b.result.locality.toLowerCase().includes(city.trim().toLowerCase());
}

export const mockApi: GapMapApi = {
  async search(query, city) {
    await delay(jitter());
    // Explicit error path for testing.
    if (query.trim().toLowerCase() === "notfound") return [];
    if (query.trim().toLowerCase() === "error") {
      throw new ApiError("Search service unavailable", 500);
    }

    const hits = Object.values(MOCK_DB).filter((b) => matchesQuery(b, query, city));

    // If nothing matches exactly, fall back to a synthetic result so the UI is
    // always exercisable even with made-up queries during dev.
    if (hits.length === 0) {
      const q = query.trim();
      if (!q) return [];
      return [
        {
          fsq_place_id: "mock_synthetic_001",
          name: `${q}`,
          address: "123 Main St",
          locality: city || "New York",
          region: "NY",
          postcode: "10001",
        },
      ];
    }

    return hits.slice(0, 10).map((b) => b.result);
  },

  async getReport(placeId) {
    await delay(jitter());
    if (placeId === "error_001") {
      throw new ApiError("Failed to generate risk report", 500);
    }
    const entry = MOCK_DB[placeId];
    if (entry) return entry.report;
    // Synthetic fallback — gives the synthetic search result a plausible report.
    return MOCK_DB.mock_brooklyn_laundry.report;
  },

  async getCompetitors(placeId) {
    await delay(jitter());
    const entry = MOCK_DB[placeId];
    if (entry) return entry.competitors;
    return MOCK_DB.mock_brooklyn_laundry.competitors;
  },
};
