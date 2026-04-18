import { useQuery } from "@tanstack/react-query";
import { getCases } from "../api/cases";
import { queryKeys } from "./queryKeys";

export function useCases(names?: string[]) {
  return useQuery({
    queryKey: queryKeys.cases(names),
    queryFn: () => getCases(names),
    staleTime: 5 * 60_000,
  });
}
