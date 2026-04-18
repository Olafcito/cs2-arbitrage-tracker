import { useQuery } from "@tanstack/react-query";
import { getExchangeRate } from "../api/utils";
import { queryKeys } from "./queryKeys";

export function useExchangeRate() {
  return useQuery({
    queryKey: queryKeys.exchangeRate,
    queryFn: getExchangeRate,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
