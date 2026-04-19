import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/api";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
    // Categories basically never change — cache forever during session.
    staleTime: Infinity,
  });
}