import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";

export function useCompetitors(placeId: string | null) {
  return useQuery({
    queryKey: ["competitors", placeId],
    queryFn: () => api.getCompetitors(placeId!),
    enabled: !!placeId,
    staleTime: 60_000,
  });
}
