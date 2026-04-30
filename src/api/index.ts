import { realApi } from "./client";
import { mockApi } from "./mockApi";
import type { AcqmentApi } from "./types";

// Single point of swap. Flip NEXT_PUBLIC_USE_MOCK_API to "false" (or unset)
// once the backend is up, and no UI code needs to change.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export const api: AcqmentApi = USE_MOCK ? mockApi : realApi;

export * from "./types";
