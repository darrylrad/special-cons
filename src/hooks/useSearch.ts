import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type SearchFilters } from "@/src/api";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Returns true if at least one filter is actively constraining results.
 * Year slider at full range (0 to max) is considered inactive.
 */
export function hasActiveFilters(
  query: string,
  filters: SearchFilters,
  yearMax: number
) {
  if (query.trim().length > 0) return true;
  if (filters.city && filters.city.trim().length > 0) return true;
  if (filters.category && filters.category.length > 0) return true;
  if (filters.minYears !== undefined && filters.minYears > 0) return true;
  if (filters.maxYears !== undefined && filters.maxYears < yearMax) return true;
  return false;
}

export function useSearch(
  query: string,
  filters: SearchFilters,
  enabled: boolean
) {
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const debouncedFilters = useDebouncedValue(filters, 250);

  return useQuery({
    queryKey: ["search", debouncedQuery, debouncedFilters],
    queryFn: () => api.search(debouncedQuery, debouncedFilters),
    enabled,
    staleTime: 30_000,
  });
}