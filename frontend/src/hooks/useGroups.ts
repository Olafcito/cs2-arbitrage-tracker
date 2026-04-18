import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGroup,
  deleteGroup,
  getGroups,
  syncGroup,
  updateGroup,
} from "../api/groups";
import type { GroupInput, GroupPatch, ItemGroup } from "../types/api";
import { queryKeys } from "./queryKeys";

export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: getGroups });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inp: GroupInput) => createGroup(inp),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GroupPatch }) =>
      updateGroup(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups });
      const previous = qc.getQueryData<ItemGroup[]>(queryKeys.groups);
      qc.setQueryData<ItemGroup[]>(queryKeys.groups, (old = []) =>
        old.filter((g) => g.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.groups, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useSyncGroup() {
  return useMutation({
    mutationFn: (id: string) => syncGroup(id),
  });
}
