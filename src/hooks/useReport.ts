import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";

export function useReport(placeId: string | null) {
  return useQuery({
    queryKey: ["report", placeId],
    queryFn: () => api.getReport(placeId!),
    enabled: !!placeId,
    staleTime: 60_000,
  });
}
