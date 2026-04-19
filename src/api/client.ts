import type {
  Competitor,
  AcquiraApi,
  Report,
  SearchResult,
} from "./types";
import { ApiError } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {
      // body wasn't JSON — keep the default message.
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

// -----------------------------------------------------------------------------
// Normalizers — the backend's CSV-derived field names drift slightly from the
// frontend contract. We translate here so the rest of the app doesn't have to
// care. Keep this the ONLY place these keys are referenced.
// -----------------------------------------------------------------------------

interface RawSearchResult {
  fsq_place_id: string;
  name: string;
  address: string;
  locality: string;
  region?: string;
  zip_clean?: string | number;
  postcode?: string;
  level1?: string;
  level2?: string;
  latitude?: number;
  longitude?: number;
  overall_score?: number;
  verdict?: string;
  age_years?: number;
}

interface RawReport {
  business: {
    name: string;
    address: string;
    locality: string;
    region: string;
    postcode: string | number;
    latitude: number;
    longitude: number;
    category: string;
    level1?: string;
    level2?: string;
    level3?: string;
  };
  verdict: string;
  overall_score: number;
  scores: {
    saturation: number;
    churn: number;
    stability: number;
    diversity: number;
    red_flags: number;
  };
  details: {
    // Backend sends these names; frontend wants competitors_nearby,
    // category_closure_rate, avg_competitor_age_years, ecosystem_categories.
    competitors_in_zip?: number;
    historical_closure_rate?: number;
    avg_competitor_age_years?: number;
    ecosystem_diversity?: number;
    population?: number | null;
    businesses_per_10k?: number | null;
  };
}

interface RawCompetitor {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  date_created: string;
  level3?: string;
}

function normalizeSearch(raw: RawSearchResult): SearchResult {
  return {
    fsq_place_id: raw.fsq_place_id,
    name: raw.name ?? "",
    address: raw.address ?? "",
    locality: raw.locality ?? "",
    region: raw.region ?? "",
    postcode: String(raw.postcode ?? raw.zip_clean ?? ""),
    level1: raw.level1,
    level2: raw.level2,
    overall_score: raw.overall_score,
    verdict: raw.verdict as any,
    age_years: raw.age_years,
  };
}

function normalizeReport(raw: RawReport): Report {
  return {
    business: {
      name: raw.business.name,
      address: raw.business.address,
      locality: raw.business.locality,
      region: raw.business.region,
      postcode: String(raw.business.postcode ?? ""),
      latitude: Number(raw.business.latitude),
      longitude: Number(raw.business.longitude),
      category: raw.business.category || "Uncategorized",
    },
    verdict: raw.verdict as Report["verdict"],
    overall_score: Number(raw.overall_score) || 0,
    scores: {
      saturation: Number(raw.scores.saturation) || 0,
      churn: Number(raw.scores.churn) || 0,
      stability: Number(raw.scores.stability) || 0,
      diversity: Number(raw.scores.diversity) || 0,
      red_flags: Number(raw.scores.red_flags) || 0,
    },
    details: {
      competitors_nearby: Number(raw.details.competitors_in_zip ?? 0),
      category_closure_rate: Number(raw.details.historical_closure_rate ?? 0),
      avg_competitor_age_years: Number(raw.details.avg_competitor_age_years ?? 0),
      ecosystem_categories: Number(raw.details.ecosystem_diversity ?? 0),
    },
  };
}

function normalizeCompetitor(raw: RawCompetitor): Competitor {
  return {
    name: raw.name ?? "",
    address: raw.address ?? "",
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    date_created: raw.date_created ?? "",
  };
}

// -----------------------------------------------------------------------------

export const realApi: AcquiraApi = {
  async search(query, filters) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filters?.city) params.set("city", filters.city);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.minYears !== undefined) params.set("min_years", String(filters.minYears));
    if (filters?.maxYears !== undefined) params.set("max_years", String(filters.maxYears));
    const raw = await request<RawSearchResult[]>(
      `/api/search?${params.toString()}`
    );
    return raw.map(normalizeSearch);
  },
  async getCategories() {
    return request<string[]>(`/api/categories`);
  },
  async getReport(placeId) {
    const raw = await request<RawReport>(
      `/api/report/${encodeURIComponent(placeId)}`
    );
    return normalizeReport(raw);
  },
  async getCompetitors(placeId) {
    const raw = await request<RawCompetitor[]>(
      `/api/competitors/${encodeURIComponent(placeId)}`
    );
    return raw.map(normalizeCompetitor);
  },
};