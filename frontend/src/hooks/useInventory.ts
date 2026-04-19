import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventory, syncInventory } from "../api/inventory";
import { queryKeys } from "./queryKeys";

export function useInventory() {
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: getInventory,
    retry: (count, err: unknown) => {
      // Don't retry on 404 (no snapshot yet)
      const status = (err as { status?: number })?.status;
      return status !== 404 && count < 2;
    },
  });
}

export function useSyncInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncInventory,
    onSuccess: (data) => qc.setQueryData(queryKeys.inventory, data),
  });
}
