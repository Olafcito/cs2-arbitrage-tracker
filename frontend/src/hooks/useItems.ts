import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addItem, deleteItem, getItems, syncItem, syncAllItems } from "../api/items";
import { api } from "../api/client";
import type { ArbitrageItem } from "../types/api";
import { queryKeys } from "./queryKeys";

export function useItems() {
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: getItems,
    staleTime: 30_000,
  });
}

export function useRateLimitStatus() {
  return useQuery({
    queryKey: queryKeys.rateLimitStatus,
    queryFn: () => api.get<{ requests_in_window: number; capacity: number; retry_after_seconds: number | null }>("/rate-limit"),
    refetchInterval: 5_000,
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => addItem(name),
    onSuccess: (newItem) => {
      qc.setQueryData<ArbitrageItem[]>(queryKeys.items, (old = []) => [
        ...old,
        newItem,
      ]);
      qc.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteItem(name),
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: queryKeys.items });
      const previous = qc.getQueryData<ArbitrageItem[]>(queryKeys.items);
      qc.setQueryData<ArbitrageItem[]>(queryKeys.items, (old = []) =>
        old.filter((item) => item.name !== name)
      );
      return { previous };
    },
    onError: (_err, _name, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.items, ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}

export function useSyncItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => syncItem(name),
    onSuccess: (updated) => {
      qc.setQueryData<ArbitrageItem[]>(queryKeys.items, (old = []) =>
        old.map((item) => (item.name === updated.name ? updated : item))
      );
    },
  });
}

export function useSyncAllItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncAllItems,
    onSuccess: () => {
      // Poll until items stop changing — simple approach: refetch every 4s for 60s
      let ticks = 0;
      const interval = setInterval(() => {
        qc.invalidateQueries({ queryKey: queryKeys.items });
        ticks++;
        if (ticks >= 15) clearInterval(interval);
      }, 4_000);
    },
  });
}
