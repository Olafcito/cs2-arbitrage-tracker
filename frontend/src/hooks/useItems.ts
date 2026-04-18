import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addItem, deleteItem, getItems } from "../api/items";
import type { ArbitrageItem } from "../types/api";
import { queryKeys } from "./queryKeys";

export function useItems() {
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: getItems,
    staleTime: 30_000,
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
