import { useQuery } from "@tanstack/react-query";
import { getDeals } from "../api/deals";
import type { DealsParams } from "../api/deals";
import { queryKeys } from "./queryKeys";

export function useDeals(params: DealsParams) {
  const isVerify = params.verify === true;
  return useQuery({
    queryKey: queryKeys.deals(params),
    queryFn: () => getDeals(params),
    staleTime: isVerify ? 0 : 60_000,
    gcTime: isVerify ? 0 : 300_000,
    refetchOnWindowFocus: false,
  });
}
