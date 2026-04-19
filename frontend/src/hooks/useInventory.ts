import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventory, syncInventory } from "../api/inventory";
import { queryKeys } from "./queryKeys";

export function useInventory() {
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: getInventory,
  });
}

export function useSyncInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncInventory,
    onSuccess: (data) => qc.setQueryData(queryKeys.inventory, data),
  });
}
