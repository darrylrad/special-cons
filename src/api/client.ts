import type {
  Competitor,
  GapMapApi,
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
    // All calls are client-side; never cache stale results in the fetch layer.
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

export const realApi: GapMapApi = {
  async search(query, city) {
    const params = new URLSearchParams({ q: query });
    if (city) params.set("city", city);
    return request<SearchResult[]>(`/api/search?${params.toString()}`);
  },
  async getReport(placeId) {
    return request<Report>(`/api/report/${encodeURIComponent(placeId)}`);
  },
  async getCompetitors(placeId) {
    return request<Competitor[]>(
      `/api/competitors/${encodeURIComponent(placeId)}`
    );
  },
};
