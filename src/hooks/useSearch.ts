import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";

// Small custom debounce so we don't pull in a dep just for this.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useSearch(query: string, city?: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const debouncedCity = useDebouncedValue(city?.trim() || "", 250);

  return useQuery({
    queryKey: ["search", debouncedQuery, debouncedCity],
    queryFn: () => api.search(debouncedQuery, debouncedCity || undefined),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });
}
