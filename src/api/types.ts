// Types mirror the backend API contract exactly. Keep this file as the single
// source of truth for shapes shared between mockApi.ts and client.ts.

export type Verdict = "PROCEED" | "PROCEED WITH CAUTION" | "AVOID";

export interface SearchResult {
  fsq_place_id: string;
  name: string;
  address: string;
  locality: string;
  region: string;
  postcode: string;
  // New fields returned by the updated backend
  level1?: string;
  level2?: string;
  overall_score?: number;
  verdict?: Verdict;
  age_years?: number;
}

export interface ReportBusiness {
  name: string;
  address: string;
  locality: string;
  region: string;
  postcode: string;
  latitude: number;
  longitude: number;
  category: string;
}

export interface ReportScores {
  saturation: number;
  churn: number;
  stability: number;
  diversity: number;
  red_flags: number;
}

export interface ReportDetails {
  competitors_nearby: number;
  category_closure_rate: number; // 0..1
  avg_competitor_age_years: number;
  ecosystem_categories: number;
}

export interface Report {
  business: ReportBusiness;
  verdict: Verdict;
  overall_score: number;
  scores: ReportScores;
  details: ReportDetails;
}

export interface Competitor {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  date_created: string; // ISO date
}

// Unified shape for any function in the API client.
export interface SearchFilters {
  city?: string;
  category?: string;
  minYears?: number;
  maxYears?: number;
}

export interface GapMapApi {
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  getCategories(): Promise<string[]>;
  getReport(placeId: string): Promise<Report>;
  getCompetitors(placeId: string): Promise<Competitor[]>;
}
// Custom error class so components can distinguish API errors from generic ones.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
